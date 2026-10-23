"""Served-browser smoke tests for real module loading, CSP, tab navigation and provenance.
This starts a LOCAL mock holiday gateway, not the live deployed API.
"""
import contextlib, functools, http.server, json, os, threading, unittest
from pathlib import Path
from urllib.parse import parse_qs,urlparse
from playwright.sync_api import sync_playwright, Error as PlaywrightError
ROOT=Path(__file__).resolve().parents[1]
class AppHandler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.webmanifest':'application/manifest+json'}
 def __init__(self,*args,**kw): super().__init__(*args,directory=str(ROOT),**kw)
 def log_message(self,*args): pass
 def do_GET(self):
  if urlparse(self.path).path=='/api/holidays':
   args=parse_qs(urlparse(self.path).query);c=args.get('country',[''])[0];y=args.get('year',[''])[0]
   if c=='XX':return self.json(503,{'code':'HOLIDAY_UNVERIFIED'})
   payload=[{'date':f'{y}-01-01','name':'New Year','countryCode':c,'holidayTypes':['Public']},
            {'date':f'{y}-12-25','name':'Christmas','countryCode':c,'holidayTypes':['Public']}]
   return self.json(200,payload,c)
  return super().do_GET()
 def json(self,status,data,country=''):
  encoded=json.dumps(data).encode()
  self.send_response(status);self.send_header('Content-Type','application/json')
  self.send_header('Content-Length',str(len(encoded)))
  if country:
   self.send_header('X-Holiday-Source','synthetic-ci')
   self.send_header('X-Holiday-Coverage','Synthetic test fixture - NOT verified external data')
  self.end_headers();self.wfile.write(encoded)
 def end_headers(self):
  self.send_header('X-Content-Type-Options','nosniff')
  self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'")
  super().end_headers()
class TestServed(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),AppHandler)
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
  cls.url=f'http://127.0.0.1:{cls.server.server_port}/'
  cls.playwright=sync_playwright().start()
  chromium=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
  cls.browser=cls.playwright.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.playwright.stop();cls.server.shutdown();cls.server.server_close()
 def start_page(self,zone='Europe/London',width=390):
  context=self.browser.new_context(timezone_id=zone,viewport={'width':width,'height':850})
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  self.addCleanup(context.close)
  try:
   response=page.goto(self.url,wait_until='domcontentloaded',timeout=12000)
  except PlaywrightError as exc:
   if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc) and not os.environ.get('CI'): self.skipTest('Local server navigation blocked by test environment policy')
   raise
  self.assertEqual(response.status,200)
  page.locator('#tab-clocks').wait_for()
  page.wait_for_timeout(400)
  self.assertEqual(errors,[],errors)
  return page
 def test_served_module_clocks_and_tab_a11y(self):
  page=self.start_page()
  self.assertIn('v3.0.0',page.locator('#version').inner_text())
  self.assertTrue(page.locator('#card-local').is_visible())
  self.assertEqual(page.locator('[role="tab"]').count(),3)
  page.locator('#tab-meetings').click()
  self.assertEqual(page.locator('#tab-meetings').get_attribute('aria-selected'),'true')
  self.assertTrue(page.locator('#meeting').is_visible())
  self.assertFalse(page.locator('#clocks-view').is_visible())
  self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),390)
 def test_holiday_provenance_and_navigation(self):
  page=self.start_page('America/Los_Angeles',1280)
  page.locator('#tab-holidays').click()
  page.locator('details.holiday-group').first.wait_for(timeout=10000)
  self.assertIn('available',page.locator('#holiday-status').inner_text())
  first=page.locator('details.holiday-group').first
  first.locator('summary').click()
  self.assertIn('synthetic-ci',first.locator('.holiday-provenance').inner_text())
  self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),1280)
 def test_keyboard_tabs_navigation(self):
  page=self.start_page('Asia/Kolkata',390)
  page.locator('#tab-clocks').focus();page.keyboard.press('ArrowRight')
  self.assertEqual(page.evaluate('document.activeElement.id'),'tab-meetings')
  self.assertEqual(page.locator('#tab-meetings').get_attribute('aria-selected'),'true')
if __name__=='__main__':unittest.main()
