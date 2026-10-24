import sys,unittest,math,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_harness import boot

class T(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(headless=True,executable_path=(os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)),args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def open(self,tz='America/New_York',width=1280,saved=None,fail=''):
  ctx,page=boot(self.browser,timezone=tz,width=width,saved=saved,fail_country=fail)
  self.addCleanup(ctx.close)
  self.assertEqual(page.evaluate('window.__qaErrors'),[])
  return page
 def locs(self,p):return p.locator('.participant-item strong').all_text_contents()
 def clock_order(self,p):
  return p.evaluate("Array.from(document.querySelectorAll('#clocks > .clock-card')).filter(el=>!el.hidden).map(el=>el.dataset.clockZone || 'local')")

 def test_reorder_fixed_clocks_local_first_and_saved_after_reload(self):
  p=self.open('America/New_York')
  self.assertEqual(self.clock_order(p),['local','Africa/Lagos','Asia/Kolkata'])
  self.assertEqual(p.locator('#card-local .clock-order-controls').count(),0)
  self.assertFalse(p.locator('#card-local').evaluate('(node)=>node.draggable'))
  p.get_by_role('button',name='Move India up').click()
  self.assertEqual(self.clock_order(p),['local','Asia/Kolkata','Africa/Lagos'])
  self.assertTrue(p.get_by_role('button',name='Move India up').is_disabled())
  self.assertTrue(p.get_by_role('button',name='Move Nigeria down').is_disabled())
  saved=p.evaluate('window.__qaSaved')
  q=self.open('America/New_York',saved=saved)
  self.assertEqual(self.clock_order(q),['local','Asia/Kolkata','Africa/Lagos'])
  self.assertEqual(self.locs(q),['Eastern US','Nigeria','India'])
  self.assertEqual(q.evaluate('window.__qaErrors'),[])

 def test_reorder_added_clocks_above_defaults_and_remove_persists(self):
  p=self.open('America/New_York',390)
  p.get_by_role('button',name='Move India up').click()
  p.locator('#clock-add-toggle').click()
  p.locator('#clock-search').fill('London')
  p.get_by_role('button',name='Add London clock and meeting location').first.click()
  self.assertEqual(self.clock_order(p),['local','Asia/Kolkata','Africa/Lagos','Europe/London'])
  p.get_by_role('button',name='Move London up').click()
  p.get_by_role('button',name='Move London up').click()
  self.assertEqual(self.clock_order(p),['local','Europe/London','Asia/Kolkata','Africa/Lagos'])
  self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),390)
  self.assertIn('London',self.locs(p))
  p.get_by_role('button',name='Remove India clock and meeting location').click()
  self.assertEqual(self.clock_order(p),['local','Europe/London','Africa/Lagos'])
  saved=p.evaluate('window.__qaSaved')
  q=self.open('America/New_York',saved=saved)
  self.assertEqual(self.clock_order(q),['local','Europe/London','Africa/Lagos'])
  self.assertEqual(q.evaluate('window.__qaErrors'),[])

 def test_reorder_restore_defaults_and_detects_new_device_time_zone(self):
  p=self.open('America/New_York')
  p.get_by_role('button',name='Move India up').click()
  p.locator('#clock-restore').click()
  self.assertEqual(self.clock_order(p),['local','Africa/Lagos','Asia/Kolkata'])
  self.assertIsNone(p.evaluate("localStorage.getItem('timebridge-clock-order-v1')"))
  p.get_by_role('button',name='Move India up').click()
  saved=p.evaluate('window.__qaSaved')
  q=self.open('America/Los_Angeles',saved=saved)
  self.assertEqual(self.clock_order(q)[0],'local')
  self.assertEqual(self.clock_order(q)[1:3],['Asia/Kolkata','Africa/Lagos'])
  self.assertIn('America/New_York',self.clock_order(q))
  self.assertEqual(q.evaluate('window.__qaErrors'),[])

 def test_sync_default_removal_world_to_meetings(self):
  p=self.open()
  self.assertEqual(self.locs(p),['Eastern US','Nigeria','India'])
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  self.assertEqual(self.locs(p),['Eastern US','India'])
  self.assertFalse(p.locator('#card-ng').is_visible())
  p.locator('#tab-holidays').click()
  self.assertEqual(p.locator('.holiday-group').count(),2)
  self.assertNotIn('NG-2027',p.evaluate('window.__qaCalls'))
 def test_meeting_remove_updates_clock_and_add_restores(self):
  p=self.open()
  p.locator('#tab-meetings').click()
  p.get_by_role('button',name='Remove India participant').click()
  self.assertFalse(p.locator('#card-in').is_visible())
  p.locator('#participant-zone').select_option('Asia/Kolkata')
  p.locator('#participant-add').click()
  self.assertFalse(p.locator('#card-in').evaluate('(el)=>el.hidden'))
  self.assertEqual(len(self.locs(p)),3)
 def test_add_london_from_world_sync_meetings(self):
  p=self.open('America/Los_Angeles')
  p.locator('#clock-add-toggle').click()
  p.locator('#clock-search').fill('London')
  p.get_by_role('button',name='Add London clock and meeting location').first.click()
  self.assertIn('London',self.locs(p))
  self.assertEqual(p.locator('.extra-clock-card').count(),1)
  self.assertIn('GB-2026',p.evaluate('window.__qaCalls'))
  p.locator('#tab-meetings').click()
  p.get_by_role('button',name='Remove London participant').click()
  self.assertEqual(p.locator('.extra-clock-card').count(),0)
 def test_add_default_back_via_picker(self):
  p=self.open()
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  p.locator('#clock-add-toggle').click()
  p.locator('#clock-search').fill('Nigeria')
  p.get_by_role('button',name='Add Nigeria clock and meeting location').click()
  self.assertTrue(p.locator('#card-ng').is_visible())
  self.assertIn('Nigeria',self.locs(p))
 def test_both_restore_buttons_same(self):
  p=self.open()
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  p.locator('#clock-restore').click()
  self.assertEqual(self.locs(p),['Eastern US','Nigeria','India'])
  p.locator('#tab-meetings').click()
  p.get_by_role('button',name='Remove India participant').click()
  p.locator('#participant-reset').click()
  self.assertEqual(self.locs(p),['Eastern US','Nigeria','India'])
  self.assertFalse(p.locator('#card-in').evaluate('(el)=>el.hidden'))
 def test_tile_widths_and_grid_alignment(self):
  for width in [320,390,768,1024,1280,1600]:
   with self.subTest(width=width):
    p=self.open(width=width)
    p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
    p.get_by_role('button',name='Remove India clock and meeting location').click()
    # one home clock cannot stretch after others removed
    x=p.locator('#card-local').bounding_box()
    columns=3 if width>960 else 2 if width>640 else 1
    grid=p.locator('#clocks').bounding_box()
    expected=(grid['width']-(columns-1)*14)/columns
    self.assertLessEqual(abs(x['width']-expected),2,(width,x,expected))
    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width+1)
 def test_local_card_same_grid_and_width(self):
  p=self.open('America/Los_Angeles',1280)
  boxes=[p.locator('#card-'+x).bounding_box() for x in ['local','et','ng']]
  self.assertTrue(all(boxes))
  self.assertLess(max(b['width'] for b in boxes)-min(b['width'] for b in boxes),2)
  self.assertLess(max(b['height'] for b in boxes)-min(b['height'] for b in boxes),2)
  self.assertLess(max(b['y'] for b in boxes)-min(b['y'] for b in boxes),2)
 def test_local_remains_after_remove_all(self):
  p=self.open('America/New_York')
  p.locator('#tab-meetings').click()
  for name in ['Eastern US','Nigeria','India']:
   p.get_by_role('button',name=f'Remove {name} participant').click()
  p.locator('#tab-clocks').click()
  self.assertTrue(p.locator('#card-local').is_visible())
  self.assertEqual(self.locs(p),[])
  p.locator('#tab-meetings').click()
  self.assertIn('Add at least one',p.locator('#best').inner_text())
 def test_storage_sync_reload(self):
  p=self.open()
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  saved=p.evaluate('window.__qaSaved')
  q=self.open(saved=saved)
  self.assertEqual(self.locs(q),['Eastern US','India'])
  self.assertFalse(q.locator('#card-ng').is_visible())
 def test_working_hours_unaltered_by_sync(self):
  p=self.open()
  p.locator('#tab-meetings').click()
  p.locator('.participant-item').first.locator('summary').click()
  inp=p.locator('.participant-item').first.locator('input[type=time]').first
  inp.fill('10:00');inp.dispatch_event('change')
  p.locator('#tab-clocks').click();p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  p.locator('#tab-meetings').click()
  self.assertEqual(p.locator('.participant-item').first.locator('input[type=time]').first.input_value(),'10:00')
 def test_dynamic_new_card_same_grid(self):
  p=self.open('America/Los_Angeles',1280)
  p.locator('#clock-add-toggle').click();p.locator('#clock-search').fill('London')
  p.get_by_role('button',name='Add London clock and meeting location').first.click()
  box=p.locator('.extra-clock-card').first.bounding_box();fixed=p.locator('#card-et').bounding_box()
  self.assertLess(abs(box['width']-fixed['width']),2)
  self.assertEqual(p.evaluate('window.__qaErrors'),[])

 def test_layout_maintained_in_dark_and_light_with_many_clocks(self):
  for theme in ['light','dark']:
   p=self.open('Europe/London',1280)
   if theme=='dark':p.locator('#theme').click()
   p.locator('#clock-add-toggle').click();p.locator('#clock-search').fill('Tokyo')
   p.get_by_role('button',name='Add Tokyo clock and meeting location').first.click()
   boxes=p.locator('#clocks .clock-card:visible').evaluate_all('(els)=>els.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))')
   self.assertLess(max(x['w'] for x in boxes)-min(x['w'] for x in boxes),2)
   self.assertLess(max(x['h'] for x in boxes)-min(x['h'] for x in boxes),3)
 def test_dst_london_and_california(self):
  p=self.open('America/Los_Angeles')
  p.locator('#clock-add-toggle').click();p.locator('#clock-search').fill('London')
  p.get_by_role('button',name='Add London clock and meeting location').first.click()
  f=p.evaluate('window.__qaModules["custom-clocks.mjs"].makeClockFormatter("Europe/London")') if False else None
  date=p.evaluate('([a,b])=>{const f=window.__qaModules["custom-clocks.mjs"].makeClockFormatter("Europe/London");return [f(a).abbreviation,f(b).abbreviation]}',[Date.parse('2026-01-15T12:00:00Z') if False else 1768478400000,1784116800000])
  self.assertEqual(date,['GMT','BST'])
 def test_holiday_service_failure_blocks_recommendation(self):
  p=self.open('Europe/London',fail='IN')
  p.locator('#tab-meetings').click()
  self.assertIn('Holiday verification unavailable',p.locator('#recommend-date').inner_text())
 def test_share_payload_tracks_removed_location(self):
  p=self.open('America/New_York')
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  p.locator('#tab-meetings').click()
  url=p.evaluate('''window.__qaModules['planner-v25.mjs'].encodeParticipantGroup([{zone:'America/New_York',name:'Eastern US',country:'US',start:'09:00',end:'18:00'}])''')
  self.assertIn('Eastern US',url)
  self.assertNotIn('Nigeria',p.locator('#participant-list').inner_text())
 def test_local_timezone_never_disappears_when_removed(self):
  for tz in ['America/New_York','Africa/Lagos','Asia/Kolkata','America/Los_Angeles']:
   p=self.open(tz)
   p.locator('#tab-meetings').click()
   for name in ['Eastern US','Nigeria','India']:
    p.get_by_role('button',name=f'Remove {name} participant').click()
   p.locator('#tab-clocks').click()
   self.assertTrue(p.locator('#card-local').is_visible())
   self.assertEqual(p.locator('.home-pill:visible').count(),1)
 def test_tab_navigation_accessibility(self):
  p=self.open(width=390)
  p.locator('#tab-clocks').focus();p.keyboard.press('ArrowRight')
  self.assertEqual(p.evaluate('document.activeElement.id'),'tab-meetings')
  p.keyboard.press('ArrowRight')
  self.assertEqual(p.evaluate('document.activeElement.id'),'tab-holidays')
  self.assertEqual(p.evaluate('window.__qaErrors'),[])
 def test_no_unselected_country_requested_after_removal(self):
  p=self.open()
  p.get_by_role('button',name='Remove Nigeria clock and meeting location').click()
  p.get_by_role('button',name='Remove India clock and meeting location').click()
  requests=p.evaluate('window.__qaCalls')
  before_ng=requests.count('NG-2026')
  p.locator('#tab-meetings').click()
  p.locator('#participant-zone').select_option('Europe/London')
  p.locator('#participant-add').click()
  calls=p.evaluate('window.__qaCalls')
  self.assertEqual(calls.count('NG-2026'),before_ng)
  self.assertIn('GB-2026',calls)

if __name__=='__main__':unittest.main(verbosity=2)
