import sys,unittest,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot

BASE=[('Eastern US','America/New_York','US'),('Nigeria','Africa/Lagos','NG'),('India','Asia/Kolkata','IN')]
EXTRAS=[('London','Europe/London','GB'),('Dubai','Asia/Dubai','AE'),('Tokyo','Asia/Tokyo','JP'),('Sydney','Australia/Sydney','AU'),('Auckland','Pacific/Auckland','NZ')]
class TestV252(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,executable_path=(os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.p.stop()
 def boot(self,tz='America/New_York',width=1280,participants=None):
  saved=None
  if participants is not None:
   saved={'timebridge-participants-v25':json.dumps([{'name':name,'zone':zone,'country':country,'start':'09:00','end':'18:00'} for name,zone,country in participants])}
  ctx,page=boot(self.browser,timezone=tz,width=width,saved=saved)
  self.addCleanup(ctx.close)
  self.assertEqual(page.evaluate('window.__qaErrors'),[])
  return page
 def test_eastern_local_always_visible_and_no_duplicate(self):
  p=self.boot()
  self.assertTrue(p.locator('#card-local').is_visible())
  self.assertIn('Eastern Time',p.locator('#local-clock-name').inner_text())
  self.assertIn('Eastern US',p.locator('#local-clock-name').inner_text())
  self.assertFalse(p.locator('#card-et').is_visible())
  p.locator('#tab-meetings').click();p.get_by_role('button',name='Remove Eastern US participant').click()
  p.locator('#tab-clocks').click()
  self.assertTrue(p.locator('#card-local').is_visible());self.assertFalse(p.locator('#card-et').is_visible())
  self.assertEqual(p.locator('#clocks .home-pill:visible').count(),1)
 def test_california_and_london_labels(self):
  for tz,term in [('America/Los_Angeles','Pacific Time'),('Europe/London','UK Time'),('Asia/Kolkata','India Standard Time')]:
   with self.subTest(tz=tz):
    p=self.boot(tz)
    self.assertIn(term,p.locator('#local-clock-name').inner_text())
    self.assertEqual(p.locator('.home-pill:visible').count(),1)
 def test_eight_participants_disables_add_adjacent(self):
  p=self.boot(participants=BASE+EXTRAS)
  self.assertTrue(p.locator('#clock-add-toggle').is_disabled())
  self.assertTrue(p.locator('#clock-add-limit').is_visible())
  self.assertIn('Maximum 8 meeting locations reached.',p.locator('#clock-add-limit').inner_text())
  self.assertTrue(p.locator('#clock-add-action').count()==0)
  self.assertTrue(p.locator('#clock-add-limit').evaluate('(e)=>e.parentElement.contains(document.querySelector("#clock-add-toggle"))'))
  self.assertTrue(p.locator('#clock-add-panel').is_hidden())
  p.locator('#tab-meetings').click()
  self.assertTrue(p.locator('#participant-add').is_disabled());self.assertTrue(p.locator('#participant-limit').is_visible())
  p.get_by_role('button',name='Remove Nigeria participant').click()
  self.assertFalse(p.locator('#participant-add').is_disabled());self.assertTrue(p.locator('#participant-limit').is_hidden())
  p.locator('#tab-clocks').click()
  self.assertFalse(p.locator('#clock-add-toggle').is_disabled());self.assertTrue(p.locator('#clock-add-limit').is_hidden())
 def test_hours_compact_edit_save_persist(self):
  p=self.boot();p.locator('#tab-meetings').click()
  cards=p.locator('.participant-item')
  self.assertEqual(cards.count(),3)
  self.assertEqual(p.locator('input[type="time"]').count(),7) # 3x2 participant hours plus converter input
  self.assertEqual(p.locator('.participant-hours-disclosure[open]').count(),0)
  self.assertIn('9 AM–6 PM',cards.first.locator('.participant-hours-summary').inner_text())
  cards.first.locator('summary').click()
  self.assertTrue(cards.first.locator('.participant-hours-disclosure').evaluate('(e)=>e.open'))
  cards.first.get_by_label('Eastern US working start').fill('07:00')
  cards.first.get_by_label('Eastern US working start').dispatch_event('change')
  self.assertIn('7 AM–6 PM',cards.first.locator('.participant-time-summary').inner_text())
  cards.first.get_by_role('button',name='Done').click()
  self.assertFalse(cards.first.locator('.participant-hours-disclosure').evaluate('(e)=>e.open'))
  saved=p.evaluate("JSON.parse(localStorage.getItem('timebridge-participants-v25'))")
  self.assertEqual(saved[0]['start'],'07:00')
 def test_invalid_hours_rejected(self):
  p=self.boot();p.locator('#tab-meetings').click();card=p.locator('.participant-item').first
  card.locator('summary').click();inp=card.get_by_label('Eastern US working end')
  inp.fill('09:00');inp.dispatch_event('change')
  self.assertIn('9 AM–6 PM',card.locator('.participant-time-summary').inner_text())
 def test_compact_alignment_mobile_and_desktop(self):
  for width in [320,390,768,1280]:
   with self.subTest(width=width):
    p=self.boot(width=width);p.locator('#tab-meetings').click()
    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width+2)
    self.assertLessEqual(p.locator('.participant-item').first.bounding_box()['height'],72 if width>660 else 115)
 def test_synchronized_removal_and_restore(self):
  p=self.boot();p.locator('#tab-meetings').click();p.get_by_role('button',name='Remove India participant').click()
  p.locator('#tab-clocks').click();self.assertFalse(p.locator('#card-in').is_visible())
  p.locator('#clock-restore').click();p.locator('#tab-meetings').click()
  self.assertEqual(p.locator('.participant-item').count(),3)
  self.assertEqual(p.locator('.participant-hours-disclosure[open]').count(),0)

if __name__=='__main__':unittest.main()
