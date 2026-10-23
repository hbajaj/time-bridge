from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot
folder=Path('/mnt/data/TimeBridge-v3.0-visual-QA');folder.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for tz,w in [('America/Los_Angeles',390),('Europe/London',1440)]:
  ctx,page=boot(browser,timezone=tz,width=w,height=860)
  if w==1440:page.locator('#theme').click()
  for tab in ['clocks','meetings','holidays']:
   page.locator('#tab-'+tab).click()
   if tab=='meetings':page.locator('#teams-disclosure summary').click()
   tag=tz.split('/')[-1]+'-'+str(w)+'-'+tab
   page.screenshot(path=str(folder/(tag+'.png')),full_page=True)
   print(tag,'scrollWidth',page.evaluate('document.documentElement.scrollWidth'),'viewport',w,'errors',page.evaluate('window.__qaErrors'))
  ctx.close()
 browser.close()
