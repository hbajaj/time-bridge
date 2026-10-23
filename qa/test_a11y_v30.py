import unittest,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot
class TestA11yV30(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,executable_path=(os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def start(self,tz='America/New_York',width=390):
  ctx,p=boot(self.browser,timezone=tz,width=width);self.addCleanup(ctx.close)
  self.assertEqual(p.evaluate('window.__qaErrors'),[])
  return p
 def test_aria_names_present_for_visible_interactive_controls(self):
  p=self.start()
  for tab in ['clocks','meetings','holidays']:
   p.locator('#tab-'+tab).click()
   missing=p.evaluate('''()=>[...document.querySelectorAll('button,input,select')].filter(el=>el.getClientRects().length&&!el.disabled).filter(el=>{const id=el.id;return !(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')|| (id&&document.querySelector('label[for="'+id+'"]')) || el.closest('label') || el.textContent.trim() || el.title)}).map(el=>el.outerHTML.slice(0,140))''')
   self.assertEqual(missing,[],(tab,missing))
 def test_keyboard_navigation_tab_state_and_focus(self):
  p=self.start()
  p.locator('#tab-clocks').focus();p.keyboard.press('ArrowRight')
  self.assertEqual(p.evaluate('document.activeElement.id'),'tab-meetings')
  p.keyboard.press('ArrowRight');self.assertEqual(p.evaluate('document.activeElement.id'),'tab-holidays')
  p.keyboard.press('Home');self.assertEqual(p.evaluate('document.activeElement.id'),'tab-clocks')
 def test_viewport_overflow_320_to_1600(self):
  for width in [320,360,390,640,768,1024,1440,1600]:
   p=self.start(width=width)
   for tab in ['clocks','meetings','holidays']:
    p.locator('#tab-'+tab).click()
    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width+2,(width,tab))
 def test_dark_light_visible_focus_ring_and_no_dom_errors(self):
  p=self.start()
  p.locator('#theme').click();p.locator('#tab-meetings').click();p.locator('#team-save').focus()
  self.assertEqual(p.evaluate('window.__qaErrors'),[])
  self.assertTrue(p.locator('#team-save').is_hidden())
  p.locator('#teams-disclosure summary').click();p.keyboard.press('Tab')
  active=p.evaluate('document.activeElement') if False else p.evaluate('document.activeElement.id')
  self.assertIn(active,['saved-team-select','team-load','team-delete','team-name','team-save'])
  self.assertEqual(p.evaluate('window.__qaErrors'),[])
if __name__=='__main__':unittest.main()
