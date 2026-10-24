import unittest,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot

class TestHelpTour(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(headless=True,executable_path=(os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,width=390,saved=None):
  ctx,page=boot(self.browser,timezone='America/New_York',width=width,saved=saved)
  self.addCleanup(ctx.close)
  self.assertEqual(page.evaluate('window.__qaErrors'),[])
  return page
 def active(self,p):
  return p.locator('.tab-button[aria-selected="true"]').get_attribute('id')

 def test_help_one_pager_accessible_and_escape_restores_focus(self):
  p=self.open(320)
  p.locator('#tb-help-open').click()
  self.assertTrue(p.locator('#tb-help-dialog').is_visible())
  self.assertEqual(p.locator('#tb-help-dialog').get_attribute('aria-modal'),'true')
  for phrase in ['World Clocks','Smarter Meetings','Holiday Awareness','Start in three steps','No account required']:
   self.assertIn(phrase,p.locator('#tb-help-dialog').inner_text())
  self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),320)
  p.keyboard.press('Escape')
  self.assertFalse(p.locator('#tb-help-dialog').is_visible())
  self.assertEqual(p.evaluate('document.activeElement.id'),'tb-help-open')
  self.assertEqual(p.evaluate('window.__qaErrors'),[])

 def test_tour_steps_back_skip_and_restores_tab_without_changing_data(self):
  p=self.open(390)
  p.locator('#tab-meetings').click()
  before=p.evaluate("localStorage.getItem('timebridge-participants-v25')")
  saved=p.evaluate("localStorage.getItem('timebridge-active-tab-v1')")
  p.locator('#tb-help-open').click()
  p.locator('#tb-help-start-tour').click()
  self.assertFalse(p.locator('#tb-help-dialog').is_visible())
  self.assertTrue(p.locator('#tb-tour').is_visible())
  self.assertEqual(self.active(p),'tab-clocks')
  self.assertIn('Step 1 of 8',p.locator('#tb-tour-progress').inner_text())
  self.assertTrue(p.locator('#card-local').evaluate("(el)=>el.classList.contains('tb-tour-highlight')"))
  for step in range(1,8):
   p.locator('#tb-tour-next').click()
   self.assertIn('Step '+str(step+1)+' of 8',p.locator('#tb-tour-progress').inner_text())
  self.assertEqual(self.active(p),'tab-holidays')
  self.assertEqual(p.locator('#tb-tour-next').inner_text(),'Finish tour')
  self.assertTrue(p.locator('#holiday-year').evaluate("(el)=>el.classList.contains('tb-tour-highlight')"))
  p.locator('#tb-tour-back').click()
  self.assertEqual(self.active(p),'tab-meetings')
  self.assertIn('Step 7 of 8',p.locator('#tb-tour-progress').inner_text())
  p.locator('#tb-tour-close').click()
  self.assertEqual(self.active(p),'tab-meetings')
  self.assertFalse(p.locator('#tb-tour').is_visible())
  self.assertEqual(p.evaluate("localStorage.getItem('timebridge-participants-v25')"),before)
  self.assertEqual(p.evaluate("localStorage.getItem('timebridge-active-tab-v1')"),saved)
  self.assertIsNone(p.evaluate("localStorage.getItem('timebridge-tour-completed-v1')"))
  self.assertEqual(p.evaluate('window.__qaErrors'),[])

 def test_complete_tour_marks_done_but_can_be_restarted(self):
  p=self.open(390)
  p.locator('#tb-help-open').click()
  p.locator('#tb-help-start-tour').click()
  for i in range(8):
   p.locator('#tb-tour-next').click()
  self.assertFalse(p.locator('#tb-tour').is_visible())
  self.assertEqual(p.evaluate("localStorage.getItem('timebridge-tour-completed-v1')"),'true')
  self.assertEqual(self.active(p),'tab-clocks')
  p.locator('#tb-help-open').click()
  self.assertTrue(p.locator('#tb-help-start-tour').is_visible())
  self.assertFalse(p.locator('#tb-help-hint').is_visible())
  p.locator('#tb-help-start-tour').click()
  self.assertTrue(p.locator('#tb-tour').is_visible())
  p.keyboard.press('Escape')
  self.assertFalse(p.locator('#tb-tour').is_visible())
  self.assertEqual(p.evaluate('window.__qaErrors'),[])

if __name__=='__main__':unittest.main()
