AX.page(function business() {
  const faq = [
    ['When is an order invoiced?', 'When it ships (or when you pick it up). Backordered lines are invoiced separately when they ship, so you only pay for what you received.'],
    ['What happens if an invoice goes past due?', 'Past-due balances still count against your credit line, and limit increases are paused until they are paid. Real suppliers often put accounts on credit hold at 30+ days past due.'],
    ['How do approvals work?', 'Each buyer has an order limit. An order over that limit is held as "Awaiting approval" and its stock is reserved. An admin or approver approves it to release it to the warehouse, or rejects it with a reason.'],
    ['Can I get better pricing?', 'Three ways: tier pricing applies automatically by quantity, your account tier adds a contract discount, and you can request a quote for large or recurring orders. Accepted quotes hold for 30 days.'],
    ['Do you charge sales tax?', 'Yes, based on the delivery state (or the branch state for pickups), unless an exemption or resale certificate covering that state is on file.'],
    ['What is LTL freight?', 'Less-than-truckload: palletized shipping for furniture and large items. The carrier calls to book a delivery window. Add a liftgate if the site has no loading dock.'],
    ['How do returns work?', 'Start a return on a delivered order within 30 days. You get an RMA number and a prepaid label. Harbor Point inspects the return and credits the original invoice. Furniture and technology carry a 15% restocking fee unless the item was damaged, wrong or defective.']
  ];
  AX.$('#main').innerHTML = `<div class="wrap">
    <div class="page-head"><span class="eyebrow" style="color:var(--blue)">Business accounts</span><h1>Buying for a business, the way it really works</h1>
      <p class="muted" style="max-width:720px">Axiomate Shop works like a real B2B distributor: credit terms, purchase orders, buyer limits, approvals, tier and contract pricing, quotes, freight, tax exemption and returns. Everything is simulated, and order progress runs in minutes instead of days.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-accent" href="apply.html">Apply for Net 30</a><a class="btn btn-ghost" href="signin.html">Try the demo company</a></div></div>
    <div class="steps">
      <div class="step"><h3>Apply</h3><p>We score time in business, size and expected spend. Approved accounts get a credit line and a pricing tier straight away.</p></div>
      <div class="step"><h3>Set up buyers</h3><p>Admins add buyers and approvers and set a per-order limit for each buyer.</p></div>
      <div class="step"><h3>Order</h3><p>Use a PO and job number, choose ship or pickup, and see which DC each line ships from before you place the order.</p></div>
      <div class="step"><h3>Receive & pay</h3><p>Track it through picking, shipping and delivery. Each shipment is invoiced Net 30. Pay several invoices at once by ACH.</p></div>
    </div>
    <section class="section"><div class="band" style="grid-template-columns:1fr 1fr">
      <div><h2>Order lifecycle</h2><p class="muted">What happens after you click Place order, and how long each step takes in the demo:</p>
        <table class="data"><tbody>
          <tr><td><strong>Awaiting approval</strong></td><td>Only if over the buyer's limit</td><td class="num">until approved</td></tr>
          <tr><td><strong>Processing</strong></td><td>Credit check, released to the DC</td><td class="num">1 min</td></tr>
          <tr><td><strong>Picked & packed</strong></td><td>Pulled from the shelves and labeled</td><td class="num">3 min</td></tr>
          <tr><td><strong>Shipped</strong></td><td>Tracking issued, invoice created</td><td class="num">6 min</td></tr>
          <tr><td><strong>Out for delivery</strong></td><td>On the local truck</td><td class="num">10 min</td></tr>
          <tr><td><strong>Delivered</strong></td><td>Signed for, returns open</td><td class="num">15 min</td></tr>
        </tbody></table></div>
      <div><h2>Pricing tiers</h2>
        <table class="data"><thead><tr><th>Tier</th><th>Monthly spend</th><th class="num">Contract discount</th></tr></thead><tbody>
          <tr><td><strong>Standard</strong></td><td>Under $3,000</td><td class="num">List</td></tr><tr><td><strong>Silver</strong></td><td>$3,000+</td><td class="num">3%</td></tr><tr><td><strong>Gold</strong></td><td>$10,000+</td><td class="num">5%</td></tr></tbody></table>
        <p class="small muted" style="margin-top:12px">The contract discount stacks with quantity tiers. Some items (like laptops) are excluded because of manufacturer pricing rules.</p>
        <h3 style="margin-top:20px">Shipping</h3>
        <table class="data"><tbody><tr><td>Ground parcel</td><td class="num">Free over $250, otherwise $12.95</td></tr><tr><td>Next business day</td><td class="num">$34.95 (not for hazmat or freight)</td></tr><tr><td>LTL freight</td><td class="num">$129, free over $2,500</td></tr><tr><td>Liftgate / inside delivery</td><td class="num">$45 / $75</td></tr><tr><td>Branch or will-call pickup</td><td class="num">Free</td></tr></tbody></table></div>
    </div></section>
    <section class="section"><h2>Common questions</h2><div class="card">${faq.map(([q, a]) => `<details style="border-bottom:1px solid var(--line);padding:14px 0"><summary style="cursor:pointer;font-weight:600;color:var(--ink)">${q}</summary><p style="margin:10px 0 0">${a}</p></details>`).join('')}</div></section>
  </div>`;
});
