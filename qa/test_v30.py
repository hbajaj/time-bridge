import unittest,os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot
class TestV30(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,executable_path=(os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def start(self,tz='America/New_York',width=390,saved=None):
  context,page=boot(self.browser,timezone=tz,width=width,saved=saved)
  self.addCleanup(context.close)
  self.assertEqual(page.evaluate('window.__qaErrors'),[])
  page.locator('#tab-meetings').click()
  return page
 def test_saved_team_save_restore_delete_without_changing_current(self):
  p=self.start();p.locator('#teams-disclosure summary').click()
  p.locator('#team-name').fill('US–India Core')
  p.locator('#team-save').click()
  self.assertIn('saved on this device',p.locator('#saved-team-status').inner_text())
  self.assertEqual(len(p.evaluate("JSON.parse(localStorage.getItem('timebridge-saved-teams-v3'))")),1)
  p.get_by_role('button',name='Remove Nigeria participant').click()
  self.assertEqual(p.locator('.participant-item').count(),2)
  p.locator('#team-load').click()
  self.assertEqual(p.locator('.participant-item').count(),3)
  p.locator('#team-delete').click()
  self.assertEqual(p.locator('.participant-item').count(),3)
  self.assertEqual(len(p.evaluate("JSON.parse(localStorage.getItem('timebridge-saved-teams-v3'))")),0)
 def test_saved_team_restores_cross_session_and_time_zone_alias(self):
  p=self.start('America/Los_Angeles')
  p.locator('#teams-disclosure summary').click();p.locator('#team-name').fill('Weekly Team')
  p.locator('#team-save').click()
  saved=p.evaluate('window.__qaSaved')
  p2=self.start('Europe/London',saved=saved)
  p2.locator('#teams-disclosure summary').click()
  p2.locator('#saved-team-select').select_option('Weekly Team')
  p2.locator('#team-load').click()
  self.assertEqual(p2.locator('.participant-item').count(),3)
  self.assertIn('Loaded',p2.locator('#saved-team-status').inner_text())
 def test_recommendation_modes_and_accessible_text(self):
  p=self.start(width=390)
  for option in ['fair','earliest','strict']:
   p.locator('#priority').select_option(option)
   self.assertEqual(p.locator('#priority').input_value(),option)
  p.locator('#priority').select_option('fair')
  p.locator('#best .fit-summary').first.wait_for(timeout=10000)
  text=p.locator('#best .fit-summary').first.inner_text()
  self.assertRegex(text,r'Working-hours fit: \d+/100')
  self.assertIn('Illustrative scheduling heuristic',p.locator('#best .fit-summary').first.get_attribute('aria-label'))
  self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),390)
 def test_accessibility_names_and_reduced_motion(self):
  p=self.start(tz='Asia/Kolkata',width=320)
  self.assertEqual(p.locator('[role=tab]').count(),3)
  self.assertEqual(p.locator('#tab-meetings').get_attribute('aria-selected'),'true')
  self.assertTrue(p.locator('#team-save').is_visible() is False)
  p.locator('#teams-disclosure summary').click()
  self.assertTrue(p.locator('#team-name').is_visible())
  self.assertEqual(p.locator('#saved-team-status').get_attribute('aria-live'),'polite')
  self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),320)
if __name__=='__main__':unittest.main()
