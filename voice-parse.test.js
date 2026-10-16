// Voice helpline parsing tests. Run: node --test voice-parse.test.js
const test = require('node:test');
const assert = require('node:assert');
const vp = require('./voice-parse');

test('parses Hinglish group + area + urgency + units', () => {
  const i = vp.parseVoiceIntent('O positive chahiye Dilsukhnagar me urgent, 2 units');
  assert.equal(i.bloodGroup, 'O+');
  assert.equal(i.area, 'Dilsukhnagar');
  assert.equal(i.urgency, 'urgent');
  assert.equal(i.units, 2);
});

test('compact group forms and spoken variants', () => {
  assert.equal(vp.parseGroup('mujhe b- chahiye'), 'B-');
  assert.equal(vp.parseGroup('oh positive blood'), 'O+');
  assert.equal(vp.parseGroup('AB negative urgently'), 'AB-');
  assert.equal(vp.parseGroup('bee plus'), 'B+');
  assert.equal(vp.parseGroup('koi group nahi bola'), null);
});

test('area aliases resolve to known areas', () => {
  assert.equal(vp.parseArea('kphb me chahiye'), 'Kukatpally');
  assert.equal(vp.parseArea('sikandarabad urgent'), 'Secunderabad');
  assert.equal(vp.parseArea('banjara hills side'), 'Banjara Hills');
  assert.equal(vp.parseArea('kahin bhi nahi bola'), null);
});

test('component and units', () => {
  assert.equal(vp.parseComponent('platelets chahiye'), 'Platelets');
  assert.equal(vp.parseComponent('plasma donor'), 'Plasma');
  assert.equal(vp.parseComponent('blood chahiye'), 'Whole blood');
  assert.equal(vp.parseUnits('ek unit'), 1);
  assert.equal(vp.parseUnits('do units'), 2);
  assert.equal(vp.parseUnits('3 bottles'), 3);
  assert.equal(vp.parseUnits('kuch bhi'), 1);
});

test('emergency wording escalates urgency', () => {
  assert.equal(vp.parseUrgency('emergency hai turant'), 'critical');
  assert.equal(vp.parseUrgency('jaldi chahiye'), 'urgent');
});

test('reply asks for missing pieces', () => {
  assert.match(vp.buildReply({ bloodGroup: null, area: 'Uppal' }, []), /Blood group bataiye/);
  assert.match(vp.buildReply({ bloodGroup: 'A+', area: null }, []), /Area bataiye/);
  assert.match(vp.buildReply({ bloodGroup: null, area: null }, []), /phir se bataiye/);
});

test('reply lists matches with privacy note and demo disclaimer', () => {
  const matches = [{ donor: { name: 'Rahul' }, km: 2.1 }, { donor: { name: 'Sneha' }, km: 4.0 }];
  const r = vp.buildReply({ bloodGroup: 'O+', area: 'Miyapur' }, matches);
  assert.match(r, /2 donor mile/);
  assert.match(r, /Rahul, 2.1 kilometer/);
  assert.match(r, /number private/);
  assert.match(r, /demo data hai/);
});

test('no-match reply is honest', () => {
  const r = vp.buildReply({ bloodGroup: 'B-', area: 'Uppal' }, []);
  assert.match(r, /nahi mila/);
});

test('Devanagari transcripts parse too', () => {
  const i = vp.parseVoiceIntent('मुझे बी नेगेटिव चाहिए कुकटपल्ली में');
  assert.equal(i.bloodGroup, 'B-');
  assert.equal(i.area, 'Kukatpally');
  assert.equal(vp.parseVoiceIntent('ओ पॉजिटिव दिलसुखनगर').bloodGroup, 'O+');
  assert.equal(vp.parseVoiceIntent('एबी नेगेटिव चारमीनार').bloodGroup, 'AB-');
});
