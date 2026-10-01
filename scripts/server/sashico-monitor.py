#!/usr/bin/env python3
"""
Sashico uptime + "shopper refused" monitor (runs on the cPanel server via cron, every 15 min).

Sends a Telegram alert (same bot as order alerts) when:
  1. the homepage doesn't load (error or > 15 s), or
  2. a real browser got 502/503/504/508 since the last run (508 = hosting
     plan's concurrent-request limit reached), or
  3. bots were refused 50+ times (limit being hit even if no shopper was).
Stays silent otherwise. Independent of the Node app so it still works when the site is down.

Install: copy to ~/bin/sashico-monitor.py and add to crontab:
  */15 * * * * /usr/bin/python3 $HOME/bin/sashico-monitor.py >/dev/null 2>&1
"""
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

HOME = os.path.expanduser("~")
LOG = f"{HOME}/access-logs/sashico.net-ssl_log"
STATE = f"{HOME}/.sashico-monitor-state.json"
ENV = f"{HOME}/sashico-app/env.json"
SITE = "https://sashico.net/"
BOT_RE = re.compile(r"facebookexternalhit|meta-external|bot|crawl|spider|slurp|monitor", re.I)
LINE_RE = re.compile(r'^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"')
ERR_CODES = {"502", "503", "504", "508"}


def telegram(text: str) -> None:
    env = json.load(open(ENV))
    h = {"apikey": env["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"]}
    url = env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/telegram_settings?select=bot_token,chat_id,is_enabled&id=eq.1"
    cfg = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=20))[0]
    if not cfg.get("is_enabled"):
        return
    body = json.dumps({"chat_id": cfg["chat_id"], "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}).encode()
    urllib.request.urlopen(urllib.request.Request(
        f"https://api.telegram.org/bot{cfg['bot_token']}/sendMessage", data=body,
        headers={"Content-Type": "application/json"}), timeout=20)


def check_site():
    """Load the homepage the way a visitor would."""
    start = time.time()
    try:
        req = urllib.request.Request(SITE, headers={"User-Agent": "SashicoUptimeMonitor/1.0"})
        status = urllib.request.urlopen(req, timeout=15).status
        return status, round(time.time() - start, 1)
    except urllib.error.HTTPError as e:
        return e.code, round(time.time() - start, 1)
    except Exception as e:  # timeout / connection refused
        return type(e).__name__, round(time.time() - start, 1)


def main() -> None:
    now = datetime.now(timezone.utc)
    try:
        state = json.load(open(STATE))
        since = datetime.fromisoformat(state["last_check"])
    except Exception:
        since = now - timedelta(minutes=15)

    alerts = []

    status, secs = check_site()
    if status != 200 or secs > 15:
        alerts.append(f"🔴 <b>sashico.net is not loading</b> — homepage returned <code>{status}</code> after {secs}s.")

    shoppers, bots, paths = 0, 0, {}
    try:
        with open(LOG, errors="replace") as f:
            for line in f:
                m = LINE_RE.match(line)
                if not m or m.group(5) not in ERR_CODES:
                    continue
                ts = datetime.strptime(m.group(2), "%d/%b/%Y:%H:%M:%S %z")
                if ts <= since:
                    continue
                if BOT_RE.search(m.group(6)):
                    bots += 1
                else:
                    shoppers += 1
                    key = f"{m.group(5)} {m.group(4).split('?')[0][:60]}"
                    paths[key] = paths.get(key, 0) + 1
    except FileNotFoundError:
        pass

    if shoppers:
        top = "\n".join(f"• {k} ×{v}" for k, v in sorted(paths.items(), key=lambda x: -x[1])[:5])
        alerts.append(
            f"⚠️ <b>{shoppers} shopper request(s) refused</b> since {since.astimezone(timezone(timedelta(hours=6))):%H:%M}\n{top}\n"
            "508 = hosting plan's 20-request limit reached. If this repeats, ask ADN Diginet to raise Entry Processes.")
    if bots >= 50:
        alerts.append(f"ℹ️ {bots} bot/crawler requests were refused (server at its limit). Shoppers weren't affected this time.")

    if alerts:
        telegram("🖥 <b>Sashico server monitor</b>\n\n" + "\n\n".join(alerts))

    json.dump({"last_check": now.isoformat(), "last_status": str(status), "last_secs": secs,
               "shoppers_refused": shoppers, "bots_refused": bots}, open(STATE, "w"))


if __name__ == "__main__":
    main()
