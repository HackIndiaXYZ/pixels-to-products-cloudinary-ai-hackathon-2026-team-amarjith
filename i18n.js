// Lightweight UI translation (English / Hindi / Telugu). It swaps exact English text nodes and
// placeholders for translations, so no HTML needs to change. Text not in the dictionary stays English.
// NOTE: translations are first drafts and should be reviewed by native speakers.
(function () {
  var D = {
    'Home': ['होम', 'హోమ్'], 'SOS': ['SOS', 'SOS'], 'Donors': ['डोनर', 'దాతలు'], 'Safety': ['सुरक्षा', 'భద్రత'],
    'Hyderabad • Bank-only donation': ['हैदराबाद • सिर्फ ब्लड बैंक में दान', 'హైదరాబాద్ • కేవలం బ్లడ్ బ్యాంక్‌లో దానం'],
    'LIVE': ['लाइव', 'లైవ్'],
    'EMERGENCY • HYDERABAD': ['इमरजेंसी • हैदराबाद', 'అత్యవసరం • హైదరాబాద్'],
    'Smart radius': ['स्मार्ट रेडियस', 'స్మార్ట్ రేడియస్'],
    'Need blood?': ['खून चाहिए?', 'రక్తం కావాలా?'],
    'Find a donor': ['डोनर खोजें', 'దాతను వెతకండి'],
    'nearby, fast.': ['पास में, तुरंत।', 'దగ్గరలో, వేగంగా.'],
    'ABO-compatible matching by distance & cooldown. Chat safely — no phone numbers. Bank-only donation.': ['दूरी और कूलडाउन के हिसाब से ABO-संगत मैचिंग। सुरक्षित चैट, फोन नंबर नहीं दिखते। दान सिर्फ ब्लड बैंक में।', 'దూరం, కూల్‌డౌన్ ఆధారంగా ABO అనుకూల మ్యాచింగ్. సురక్షిత చాట్, ఫోన్ నంబర్లు కనిపించవు. దానం కేవలం బ్లడ్ బ్యాంక్‌లో.'],
    'Send emergency SOS': ['इमरजेंसी SOS भेजें', 'అత్యవసర SOS పంపండి'],
    'Become a donor • Save lives': ['डोनर बनें • जान बचाएं', 'దాత అవ్వండి • ప్రాణాలు కాపాడండి'],
    'Blood banks': ['ब्लड बैंक', 'బ్లడ్ బ్యాంకులు'], 'Escalation': ['एस्केलेशन', 'ఎస్కలేషన్'],
    'Never pay for blood.': ['खून के लिए कभी पैसे न दें।', 'రక్తం కోసం ఎప్పుడూ డబ్బు చెల్లించకండి.'],
    'How it works': ['ये कैसे काम करता है', 'ఇది ఎలా పనిచేస్తుంది'], '4 STEPS': ['4 स्टेप', '4 దశలు'],
    'Hyderabad donors': ['हैदराबाद के डोनर', 'హైదరాబాద్ దాతలు'],
    'Nearby donors': ['पास के डोनर', 'దగ్గరలోని దాతలు'], 'View all →': ['सभी देखें →', 'అన్నీ చూడండి →'],
    'Our safety promise': ['हमारा सुरक्षा वादा', 'మా భద్రతా హామీ'],
    'Read safety & report →': ['सुरक्षा पढ़ें और रिपोर्ट करें →', 'భద్రత చదవండి & రిపోర్ట్ చేయండి →'],
    'Emergency SOS': ['इमरजेंसी SOS', 'అత్యవసర SOS'], 'Safety first': ['सुरक्षा पहले', 'ముందు భద్రత'],
    'Smart matching in seconds': ['सेकंडों में स्मार्ट मैचिंग', 'సెకన్లలో స్మార్ట్ మ్యాచింగ్'],
    'Fill demo': ['डेमो भरें', 'డెమో నింపండి'],
    'Patient name *': ['मरीज़ का नाम *', 'రోగి పేరు *'], 'Contact number *': ['संपर्क नंबर *', 'సంప్రదింపు నంబర్ *'],
    '(never shown to donors)': ['(डोनर को कभी नहीं दिखता)', '(దాతలకు ఎప్పుడూ కనిపించదు)'],
    'Patient blood group *': ['मरीज़ का ब्लड ग्रुप *', 'రోగి రక్త గ్రూప్ *'],
    'Need type *': ['ज़रूरत का प्रकार *', 'అవసర రకం *'], 'Units *': ['यूनिट *', 'యూనిట్లు *'], 'units': ['यूनिट', 'యూనిట్లు'],
    'Area *': ['इलाका *', 'ప్రాంతం *'], 'Urgency *': ['कितनी जल्दी *', 'అత్యవసరత *'], 'Hospital *': ['अस्पताल *', 'ఆసుపత్రి *'],
    'Notes': ['नोट्स', 'గమనికలు'], '(optional)': ['(ज़रूरी नहीं)', '(ఐచ్ఛికం)'],
    'Find donors now': ['अभी डोनर खोजें', 'ఇప్పుడే దాతలను వెతకండి'],
    'Recent requests': ['हाल की रिक्वेस्ट', 'ఇటీవలి అభ్యర్థనలు'], 'Alerts inbox': ['अलर्ट इनबॉक्स', 'అలర్ట్ ఇన్‌బాక్స్'],
    'Register as donor': ['डोनर के रूप में रजिस्टर करें', 'దాతగా నమోదు చేసుకోండి'],
    'Register donor': ['डोनर रजिस्टर करें', 'దాతను నమోదు చేయండి'],
    'Blood group *': ['ब्लड ग्रुप *', 'రక్త గ్రూప్ *'], 'Phone (masked)': ['फोन (छिपा हुआ)', 'ఫోన్ (మాస్క్ చేయబడింది)'],
    'Last donation date': ['आखिरी दान की तारीख', 'చివరి దానం తేదీ'], 'Donor directory': ['डोनर डायरेक्टरी', 'దాతల డైరెక్టరీ'],
    'Cooldown & eligibility': ['कूलडाउन और पात्रता', 'కూల్‌డౌన్ & అర్హత'],
    'Whole blood': ['पूरा खून', 'పూర్తి రక్తం'], 'Plasma': ['प्लाज़्मा', 'ప్లాస్మా'], 'Platelets': ['प्लेटलेट्स', 'ప్లేట్‌లెట్లు'],
    '90 days': ['90 दिन', '90 రోజులు'], '28 days': ['28 दिन', '28 రోజులు'], '14 days': ['14 दिन', '14 రోజులు'],
    'Active SOS': ['एक्टिव SOS', 'యాక్టివ్ SOS'],
    'How we protect you': ['हम आपको कैसे सुरक्षित रखते हैं', 'మేము మిమ్మల్ని ఎలా రక్షిస్తాము'],
    'Report abuse': ['गलत इस्तेमाल रिपोर्ट करें', 'దుర్వినియోగాన్ని రిపోర్ట్ చేయండి'],
    'Submit report': ['रिपोर्ट भेजें', 'రిపోర్ట్ పంపండి'], 'Never do this': ['ये कभी न करें', 'ఇది ఎప్పుడూ చేయకండి'],
    'Never pay for blood. Real donors never ask for money.': ['खून के लिए कभी पैसे न दें। असली डोनर पैसे नहीं मांगते।', 'రక్తం కోసం ఎప్పుడూ డబ్బు చెల్లించకండి. నిజమైన దాతలు డబ్బు అడగరు.'],
    'Never share OTP / UPI / bank details in chat.': ['चैट में OTP / UPI / बैंक डिटेल कभी शेयर न करें।', 'చాట్‌లో OTP / UPI / బ్యాంక్ వివరాలు ఎప్పుడూ షేర్ చేయకండి.'],
    'Never donate outside authorized blood banks.': ['अधिकृत ब्लड बैंक के बाहर कभी दान न करें।', 'అధీకృత బ్లడ్ బ్యాంక్ వెలుపల ఎప్పుడూ దానం చేయకండి.'],
    'Always meet at the authorized blood bank; staff check ID there.': ['हमेशा अधिकृत ब्लड बैंक में ही मिलें; वहां स्टाफ ID जांचता है।', 'ఎల్లప్పుడూ అధీకృత బ్లడ్ బ్యాంక్‌లోనే కలవండి; అక్కడ సిబ్బంది ID తనిఖీ చేస్తారు.'],
    'Cancel': ['रद्द करें', 'రద్దు చేయండి'], 'Report': ['रिपोर्ट', 'రిపోర్ట్'], 'Donor': ['डोनर', 'దాత'], 'Request': ['रिक्वेस्ट', 'అభ్యర్థన'],
    'Review queue': ['रिव्यू कतार', 'రివ్యూ క్యూ'],
    'Held for review': ['समीक्षा के लिए रोका गया', 'సమీక్ష కోసం నిలిపివేయబడింది'],
    'Meet only at authorized blood banks. Never pay.': ['सिर्फ अधिकृत ब्लड बैंक में मिलें। कभी पैसे न दें।', 'అధీకృత బ్లడ్ బ్యాంకుల్లో మాత్రమే కలవండి. ఎప్పుడూ డబ్బు చెల్లించకండి.'],
    'Demo: donors are sample records and alerts stay inside this app. No SMS, call or WhatsApp is sent. Do not enter real personal data. Not for real emergencies.': ['डेमो: डोनर सैंपल रिकॉर्ड हैं और अलर्ट सिर्फ इसी ऐप में रहते हैं। कोई SMS, कॉल या WhatsApp नहीं जाता। असली निजी जानकारी न डालें। असली इमरजेंसी के लिए नहीं।', 'డెమో: దాతలు నమూనా రికార్డులు, అలర్ట్‌లు ఈ యాప్‌లోనే ఉంటాయి. SMS, కాల్ లేదా WhatsApp పంపబడదు. నిజమైన వ్యక్తిగత వివరాలు ఇవ్వకండి. నిజమైన అత్యవసరాలకు కాదు.'],
    'Phone masked • Chat via platform': ['फोन छिपा हुआ • प्लेटफ़ॉर्म से चैट', 'ఫోన్ మాస్క్ • ప్లాట్‌ఫామ్ ద్వారా చాట్']
  };
  var P = {
    'e.g., Lakshmi Rao': ['जैसे, लक्ष्मी राव', 'ఉదా., లక్ష్మి రావు'], '10 digit mobile': ['10 अंक का मोबाइल', '10 అంకెల మొబైల్'],
    'Type a safe message…': ['सुरक्षित मैसेज लिखें…', 'సురక్షిత సందేశం టైప్ చేయండి…'],
    'Search name or area…': ['नाम या इलाका खोजें…', 'పేరు లేదా ప్రాంతం వెతకండి…'], 'Full name *': ['पूरा नाम *', 'పూర్తి పేరు *']
  };
  var LANGS = ['en', 'hi', 'te'];
  var cur = 'en', busy = false, store = new WeakMap(), pstore = new WeakMap();
  var norm = function (s) { return s.replace(/\s+/g, ' ').trim(); };
  var idx = function (l) { return l === 'hi' ? 0 : 1; };

  function tNode(n) {
    var rec = store.get(n);
    if (rec && n.nodeValue !== rec.applied) rec = null; // text changed by the app: new original
    var orig = rec ? rec.orig : n.nodeValue;
    var key = norm(orig);
    if (cur === 'en') { if (rec) { n.nodeValue = rec.orig; store.delete(n); } return; }
    var tr = D[key];
    if (!tr) return;
    var m = orig.match(/^(\s*)[\s\S]*?(\s*)$/);
    var out = m[1] + tr[idx(cur)] + m[2];
    store.set(n, { orig: orig, applied: out });
    n.nodeValue = out;
  }
  function tPlaceholder(el) {
    var rec = pstore.get(el);
    var orig = rec && el.getAttribute('placeholder') === rec.applied ? rec.orig : el.getAttribute('placeholder');
    if (cur === 'en') { if (rec) { el.setAttribute('placeholder', rec.orig); pstore.delete(el); } return; }
    var tr = P[orig]; if (!tr) return;
    var out = tr[idx(cur)]; pstore.set(el, { orig: orig, applied: out }); el.setAttribute('placeholder', out);
  }
  function walk(root) {
    busy = true;
    try {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        return p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      var n; while ((n = w.nextNode())) tNode(n);
      if (root.querySelectorAll) root.querySelectorAll('[placeholder]').forEach(tPlaceholder);
    } finally { busy = false; }
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'en';
    cur = l; document.documentElement.lang = l;
    try { localStorage.setItem('bn-lang', l); } catch (e) {}
    var sel = document.getElementById('langSel'); if (sel && sel.value !== l) sel.value = l;
    walk(document.body);
  }
  function init() {
    var saved = 'en'; try { saved = localStorage.getItem('bn-lang') || 'en'; } catch (e) {}
    var q = new URLSearchParams(location.search).get('lang'); if (q) saved = q;
    var sel = document.getElementById('langSel');
    if (sel) sel.addEventListener('change', function () { setLang(sel.value); });
    new MutationObserver(function (muts) {
      if (busy || cur === 'en') return;
      muts.forEach(function (m) {
        if (m.type === 'characterData') tNode(m.target);
        else m.addedNodes.forEach(function (a) { if (a.nodeType === 1) walk(a); else if (a.nodeType === 3) { busy = true; tNode(a); busy = false; } });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    setLang(saved);
  }
  window.BNI18N = { setLang: setLang, dict: D };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
