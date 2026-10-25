<?php
declare(strict_types=1);

function tx(callable $fn)
{
    $pdo = db();
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        $result = $fn($pdo);
        $pdo->exec('COMMIT');
        return $result;
    } catch (Throwable $e) {
        $pdo->exec('ROLLBACK');
        throw $e;
    }
}

class BankError extends RuntimeException {}

function account_for_user(int $accountId, int $uid): array
{
    $st = db()->prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?');
    $st->execute([$accountId, $uid]);
    $a = $st->fetch();
    if (!$a) throw new BankError('Account not found.');
    return $a;
}

function pending_debits(int $accountId): int
{
    $st = db()->prepare("SELECT COALESCE(SUM(amount_cents),0) FROM transactions WHERE account_id = ? AND status = 'pending' AND amount_cents < 0");
    $st->execute([$accountId]);
    return (int)$st->fetchColumn();
}

function available_cents(array $a): int
{
    $base = (int)$a['balance_cents'] + pending_debits((int)$a['id']);
    return $a['type'] === 'credit' ? (int)$a['credit_limit_cents'] + $base : $base;
}

function post_txn(int $accountId, int $amount, string $description, string $category, string $type, array $opt = []): int
{
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM accounts WHERE id = ?');
    $st->execute([$accountId]);
    $a = $st->fetch();
    if (!$a) throw new BankError('Account not found.');

    if (empty($opt['skip_checks'])) {
        if ($amount < 0 && -$amount > available_cents($a)) {
            throw new BankError($a['type'] === 'credit'
                ? 'That would go over your available credit (' . money(available_cents($a)) . ').'
                : 'Insufficient funds. Available balance is ' . money(max(0, available_cents($a))) . '.');
        }
        if ($amount > 0 && $a['type'] === 'credit' && $amount > -(int)$a['balance_cents']) {
            throw new BankError((int)$a['balance_cents'] >= 0
                ? 'This card has no balance to pay.'
                : 'Payment can\'t be more than the balance owed (' . money(-(int)$a['balance_cents']) . ').');
        }
    }

    $created = $opt['created_at'] ?? now();
    $pending = !empty($opt['pending_seconds']);
    $newBal = (int)$a['balance_cents'] + $amount;

    $pdo->prepare('INSERT INTO transactions (account_id, amount_cents, balance_after_cents, description, category, type, status, posts_at, memo, ref, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            $accountId, $amount, $pending ? null : $newBal, $description, $category, $type,
            $pending ? 'pending' : 'posted', $pending ? $created + (int)$opt['pending_seconds'] : 0,
            $opt['memo'] ?? '', $opt['ref'] ?? '', $created,
        ]);
    $id = (int)$pdo->lastInsertId();

    if (!$pending) {
        $pdo->prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?')->execute([$newBal, $accountId]);
        if (empty($opt['silent'])) balance_alerts($a, $amount, $newBal, $description);
    }
    return $id;
}

function balance_alerts(array $a, int $amount, int $newBal, string $description): void
{
    $st = db()->prepare('SELECT alerts_large_txn, alerts_low_balance, low_balance_cents FROM users WHERE id = ?');
    $st->execute([$a['user_id']]);
    $u = $st->fetch();
    if (!$u) return;
    $uid = (int)$a['user_id'];
    if ($u['alerts_large_txn'] && $amount <= -100000) {
        notify($uid, 'Large transaction', money(-$amount) . ' left ' . $a['nickname'] . ' for "' . $description . '".', 'alert');
    }
    $limit = (int)$u['low_balance_cents'];
    $old = (int)$a['balance_cents'];
    if ($u['alerts_low_balance'] && $a['type'] !== 'credit' && $newBal < $limit && $old >= $limit) {
        notify($uid, 'Low balance', $a['nickname'] . ' is down to ' . money($newBal) . '.', 'alert');
    }
}

function new_ref(): string
{
    return 'AXB' . strtoupper(bin2hex(random_bytes(5)));
}

function process_user(int $uid): void
{
    $pdo = db();
    $t = now();

    $st = $pdo->prepare("SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id
                         WHERE a.user_id = ? AND t.status = 'pending' AND t.posts_at <= ? ORDER BY t.posts_at");
    $st->execute([$uid, $t]);
    $due = $st->fetchAll(PDO::FETCH_COLUMN);
    if ($due) {
        tx(function (PDO $pdo) use ($due, $uid) {
            foreach ($due as $id) {
                $row = $pdo->query('SELECT t.*, a.balance_cents, a.nickname FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ' . (int)$id)->fetch();
                if (!$row || $row['status'] !== 'pending') continue;
                $newBal = (int)$row['balance_cents'] + (int)$row['amount_cents'];
                $pdo->prepare("UPDATE transactions SET status = 'posted', balance_after_cents = ? WHERE id = ?")->execute([$newBal, $id]);
                $pdo->prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?')->execute([$newBal, $row['account_id']]);
                if ($row['type'] === 'deposit') {
                    notify($uid, 'Deposit available', money((int)$row['amount_cents']) . ' is now available in ' . $row['nickname'] . '.', 'success');
                }
            }
        });
    }

    $today = gmdate('Y-m-d');
    $st = $pdo->prepare("SELECT s.*, p.name AS payee_name, p.category AS payee_category FROM scheduled_payments s
                         JOIN payees p ON p.id = s.payee_id WHERE s.user_id = ? AND s.status = 'active' AND s.next_date <= ?");
    $st->execute([$uid, $today]);
    foreach ($st->fetchAll() as $s) {
        try {
            tx(function () use ($s) {
                post_txn((int)$s['account_id'], -(int)$s['amount_cents'], $s['payee_name'], $s['payee_category'], 'bill',
                    ['memo' => $s['memo'], 'ref' => new_ref()]);
            });
            notify($uid, 'Bill paid', money((int)$s['amount_cents']) . ' sent to ' . $s['payee_name'] . '.', 'success');
            $ok = true;
        } catch (BankError $e) {
            notify($uid, 'Scheduled payment failed', 'We couldn\'t pay ' . $s['payee_name'] . ': ' . $e->getMessage(), 'alert');
            $ok = false;
        }
        if ($s['frequency'] === 'once') {
            $pdo->prepare('UPDATE scheduled_payments SET status = ? WHERE id = ?')->execute([$ok ? 'completed' : 'failed', $s['id']]);
        } else {
            $next = new DateTime($s['next_date']);
            $step = $s['frequency'] === 'weekly' ? '+1 week' : '+1 month';
            do { $next->modify($step); } while ($next->format('Y-m-d') <= $today);
            $pdo->prepare('UPDATE scheduled_payments SET next_date = ? WHERE id = ?')->execute([$next->format('Y-m-d'), $s['id']]);
        }
    }

    $month = gmdate('Y-m');
    $st = $pdo->prepare("SELECT * FROM accounts WHERE user_id = ? AND type = 'savings' AND apy_bps > 0 AND interest_month < ?");
    $st->execute([$uid, $month]);
    foreach ($st->fetchAll() as $a) {
        tx(function (PDO $pdo) use ($a, $month) {
            $interest = intdiv(max(0, (int)$a['balance_cents']) * (int)$a['apy_bps'], 120000);
            if ($interest > 0) post_txn((int)$a['id'], $interest, 'Interest payment', 'Interest', 'interest', ['silent' => true]);
            $pdo->prepare('UPDATE accounts SET interest_month = ? WHERE id = ?')->execute([$month, $a['id']]);
        });
    }
}

function random_digits(int $n): string
{
    $s = (string)random_int(1, 9);
    for ($i = 1; $i < $n; $i++) $s .= (string)random_int(0, 9);
    return $s;
}

function unique_account_number(): string
{
    $st = db()->prepare('SELECT 1 FROM accounts WHERE number = ?');
    do { $n = random_digits(10); $st->execute([$n]); } while ($st->fetchColumn());
    return $n;
}

function open_starter_accounts(int $uid): void
{
    $pdo = db();
    $t = now();
    $mk = function (string $type, string $name, int $limit = 0, int $apy = 0) use ($pdo, $uid, $t) {
        $pdo->prepare('INSERT INTO accounts (user_id, type, nickname, number, credit_limit_cents, apy_bps, interest_month, created_at) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$uid, $type, $name, unique_account_number(), $limit, $apy, gmdate('Y-m'), $t - 181 * 86400]);
        return (int)$pdo->lastInsertId();
    };
    $chk = $mk('checking', 'Everyday Checking');
    $sav = $mk('savings', 'High-Yield Savings', 0, 410);
    $crd = $mk('credit', 'Axiomate Rewards Card', 800000);

    $exp = gmdate('m/y', strtotime('+4 years'));
    $card = $pdo->prepare('INSERT INTO cards (user_id, account_id, kind, last4, exp, daily_limit_cents, created_at) VALUES (?,?,?,?,?,?,?)');
    $card->execute([$uid, $chk, 'debit', sprintf('%04d', random_int(0, 9999)), $exp, 250000, $t]);
    $card->execute([$uid, $crd, 'credit', sprintf('%04d', random_int(0, 9999)), $exp, 500000, $t]);

    $payee = $pdo->prepare('INSERT INTO payees (user_id, name, category, account_hint, created_at) VALUES (?,?,?,?,?)');
    foreach ([['Parkside Apartments', 'Housing'], ['City Power & Light', 'Utilities'], ['Lumen Fiber Internet', 'Utilities'], ['Orbit Wireless', 'Utilities']] as $p) {
        $payee->execute([$uid, $p[0], $p[1], sprintf('%04d', random_int(0, 9999)), $t]);
    }

    seed_history($uid, $chk, $sav, $crd);
}

function seed_history(int $uid, int $chk, int $sav, int $crd): void
{
    $pdo = db();
    $bal = [$chk => 0, $sav => 0, $crd => 0];
    $ins = $pdo->prepare('INSERT INTO transactions (account_id, amount_cents, balance_after_cents, description, category, type, status, posts_at, memo, ref, created_at)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $now = now();
    $add = function (int $acct, int $amt, string $desc, string $cat, string $type, int $ts, string $memo = '') use (&$bal, $ins, $now) {
        if ($ts > $now) $ts = $now - random_int(60, 600);
        $pending = $amt < 0 && $type === 'card' && $now - $ts < 36 * 3600;
        if (!$pending) $bal[$acct] += $amt;
        $ins->execute([$acct, $amt, $pending ? null : $bal[$acct], $desc, $cat, $type, $pending ? 'pending' : 'posted',
            $pending ? $ts + 2 * 86400 : 0, $memo, new_ref(), $ts]);
    };
    $r = fn(int $a, int $b) => random_int($a, $b);
    $pick = fn(array $xs) => $xs[array_rand($xs)];

    $days = 180;
    $start = strtotime(gmdate('Y-m-d', $now - $days * 86400) . ' 00:00:00 UTC');
    $add($chk, 180000, 'Opening deposit', 'Transfer', 'deposit', $start + 9 * 3600);
    $add($sav, 850000, 'Opening deposit', 'Transfer', 'deposit', $start + 9 * 3600 + 60);

    $dining = ['Bluebird Coffee', 'Saffron Kitchen', 'Harbor Street Tacos', 'Nonna\'s Trattoria', 'Green Bowl', 'Midtown Burger Co.', 'Sakura Sushi Bar'];
    $shopping = ['Northgate Outfitters', 'Pixel Electronics', 'HomeNest Goods', 'Paper & Pine Books', 'Urban Sole Shoes'];

    for ($d = 0; $d <= $days; $d++) {
        $day = $start + $d * 86400;
        $dom = (int)gmdate('j', $day);
        $dow = (int)gmdate('w', $day);

        $at = fn(int $h1, int $h2) => $day + 5 * 3600 + $r($h1 * 3600, $h2 * 3600);

        if ($d % 14 === 4) $add($chk, 235000 + $r(0, 1) * 1250, 'Northwind Systems Payroll', 'Income', 'deposit', $at(6, 7), 'Direct deposit');
        if ($dom === 1) $add($chk, -165000, 'Parkside Apartments', 'Housing', 'bill', $at(8, 10), 'Rent');
        if ($dom === 3) {
            $ts = $at(9, 11);
            $add($chk, -40000, 'Transfer to High-Yield Savings', 'Transfer', 'transfer', $ts, 'Auto-save');
            $add($sav, 40000, 'Transfer from Everyday Checking', 'Transfer', 'transfer', $ts);
        }
        if ($dom === 5) $add($chk, -$r(8900, 14200), 'City Power & Light', 'Utilities', 'bill', $at(8, 12));
        if ($dom === 8) {
            $add($chk, -7999, 'Lumen Fiber Internet', 'Utilities', 'bill', $at(8, 12));
            $add($chk, -6500, 'Orbit Wireless', 'Utilities', 'bill', $at(8, 12));
        }
        if ($dom === 12) {
            $add($crd, -1599, 'StreamFlix', 'Subscriptions', 'card', $at(1, 4));
            $add($crd, -1099, 'Tunely Music', 'Subscriptions', 'card', $at(1, 4));
        }
        if ($dom === 15) $add($crd, -4500, 'Peak Fitness', 'Health', 'card', $at(5, 7));
        if ($dom === 20 && $bal[$crd] < 0) {
            $ts = $at(10, 12);
            $amt = -$bal[$crd];
            $add($chk, -$amt, 'Payment to Axiomate Rewards Card', 'Transfer', 'transfer', $ts, 'Card payment');
            $add($crd, $amt, 'Payment — thank you', 'Transfer', 'transfer', $ts);
        }
        if ($dom === 28) {
            $interest = intdiv($bal[$sav] * 410, 120000);
            $add($sav, $interest, 'Interest payment', 'Interest', 'interest', $at(2, 3));
        }
        if ($dow === 6) $add($chk, -$r(6500, 16500), 'FreshMart Grocery', 'Groceries', 'card', $at(10, 17));
        if ($dow === 3 && $r(0, 1)) $add($chk, -$r(1800, 4200), 'Corner Market', 'Groceries', 'card', $at(17, 20));
        if ($dow >= 1 && $dow <= 5 && $r(1, 10) <= 4) $add($crd, -$r(450, 790), 'Bluebird Coffee', 'Dining', 'card', $at(7, 9));
        if ($r(1, 100) <= 28) $add($crd, -$r(1800, 7200), $pick($dining), 'Dining', 'card', $at(12, 21));
        if ($d % 6 === 2) $add($chk, -$r(3800, 6400), 'Fuelway Gas', 'Transportation', 'card', $at(7, 19));
        if ($r(1, 100) <= 10) $add($crd, -$r(1200, 3400), $pick(['Metro Transit', 'RideNow']), 'Transportation', 'card', $at(8, 23));
        if ($r(1, 100) <= 9) $add($crd, -$r(2200, 18900), $pick($shopping), 'Shopping', 'card', $at(11, 20));
        if ($r(1, 100) <= 4) $add($crd, -$r(1500, 6000), $pick(['Cinema Lux', 'Gameforge Store', 'Live Arena Tickets']), 'Entertainment', 'card', $at(15, 22));
        if ($dom === 18 && $r(0, 1)) $add($chk, -$r(2500, 9000), 'Riverside Pharmacy', 'Health', 'card', $at(10, 18));
    }

    $upd = $pdo->prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?');
    foreach ($bal as $id => $b) $upd->execute([$b, $id]);
}
