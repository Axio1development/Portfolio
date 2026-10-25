<?php
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header(
    "Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
);
header("Cache-Control: no-cache");
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#09090e"><meta name="description" content="Axiomate Hub — the gathering place for the Axiomate Games community. Enter the shadows. Find your people."><title>Axiomate Hub · Enter the shadows</title><link rel="icon" href="mark.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css?v=4"><link rel="stylesheet" href="refinements.css?v=4"><link rel="stylesheet" href="profile.css?v=4"><script src="enhancements.js?v=4" defer></script><script src="profile.js?v=4" defer></script><link rel="stylesheet" href="video.css?v=4"><script src="video.js?v=4" defer></script><script src="app.js?v=4" defer></script></head><body><div id="app"><div class="boot">A<span> / </span>AXIOMATE HUB</div></div><div id="toast" role="status" aria-live="polite"></div><dialog id="modal" aria-label="Axiomate Hub dialog"></dialog></body></html>
