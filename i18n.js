// Lightweight UI translation (English / Hindi / Telugu). It swaps exact English text nodes and
// placeholders for translations, so no HTML needs to change. Text not in the dictionary stays English.
// NOTE: translations are first drafts and should be reviewed by native speakers.
(function () {
  var D = {
    // Added later: draft translations for strings that were still English (not native-reviewed).
    'Skip to content': ['सामग्री पर जाएँ', 'కంటెంట్‌కు వెళ్ళండి'],
    'ABO • Distance • Cooldown matching': ['ABO • दूरी • कूलडाउन मैचिंग', 'ABO • దూరం • కూల్‌డౌన్ మ్యాచింగ్'],
    'Authorized blood banks': ['अधिकृत ब्लड बैंक', 'అధీకృత రక్త నిధులు'],
    'Bank-only donations': ['सिर्फ ब्लड बैंक में दान', 'రక్త నిధిలో మాత్రమే దానం'],
    'Smart matching + WhatsApp share + live tracker': ['स्मार्ट मैचिंग + WhatsApp शेयर + लाइव ट्रैकर', 'స్మార్ట్ మ్యాచింగ్ + WhatsApp షేర్ + లైవ్ ట్రాకర్'],
    'Masked contacts • Fraud checks • Admin review': ['छिपे नंबर • फ्रॉड जाँच • एडमिन रिव्यू', 'దాచిన నంబర్లు • మోసం తనిఖీ • అడ్మిన్ సమీక్ష'],
    'Need blood? Find a nearby donor.': ['खून चाहिए? पास का डोनर खोजें।', 'రక్తం కావాలా? దగ్గరి దాతను వెతకండి.'],
    'Donation at authorized banks': ['अधिकृत ब्लड बैंक में दान', 'అధీకృత రక్త నిధిలో దానం'],
    'Donations always happen at authorized blood banks;': ['दान हमेशा अधिकृत ब्लड बैंक में ही होता है;', 'దానం ఎల్లప్పుడూ అధీకృత రక్త నిధిలోనే జరుగుతుంది;'],
    'matches are': ['मैच सिर्फ', 'మ్యాచ్‌లు కేవలం'],
    'potential matches only.': ['संभावित मैच हैं।', 'సంభావ్య మ్యాచ్‌లు మాత్రమే.'],
    'Send SOS': ['SOS भेजें', 'SOS పంపండి'],
    'Patient, blood group (8 types), need, units, area, urgency & hospital.': ['मरीज़, ब्लड ग्रुप (8 प्रकार), ज़रूरत, यूनिट, इलाका, अर्जेंसी और अस्पताल।', 'రోగి, రక్త గ్రూప్ (8 రకాలు), అవసరం, యూనిట్లు, ప్రాంతం, అత్యవసరత మరియు ఆసుపత్రి.'],
    'Smart matching': ['स्मार्ट मैचिंग', 'స్మార్ట్ మ్యాచింగ్'],
    'ABO check (plasma = reverse ABO) + distance + ID-on-file + cooldown → ranked score.': ['ABO जाँच (प्लाज़्मा = उल्टा ABO) + दूरी + ID फ़ाइल में + कूलडाउन → रैंक स्कोर।', 'ABO తనిఖీ (ప్లాస్మా = రివర్స్ ABO) + దూరం + ID ఫైల్‌లో + కూల్‌డౌన్ → ర్యాంక్ స్కోర్.'],
    'Chat securely': ['सुरक्षित चैट करें', 'సురక్షితంగా చాట్ చేయండి'],
    'Numbers masked. Contact via platform only. Coordinate the bank.': ['नंबर छिपे रहते हैं। संपर्क सिर्फ प्लेटफ़ॉर्म से। बैंक पर मिलने का तय करें।', 'నంబర్లు దాచబడతాయి. సంప్రదింపు ప్లాట్‌ఫామ్ ద్వారానే. రక్త నిధి వద్ద కలవండి.'],
    'Donate at bank': ['बैंक में दान करें', 'రక్త నిధిలో దానం చేయండి'],
    'Meet only at Red Cross / Chiranjeevi / Govt / Charminar centres.': ['सिर्फ रेड क्रॉस / चिरंजीवी / सरकारी / चारमीनार केंद्रों पर मिलें।', 'రెడ్ క్రాస్ / చిరంజీవి / ప్రభుత్వ / చార్మినార్ కేంద్రాలలో మాత్రమే కలవండి.'],
    'Smart matching:': ['स्मार्ट मैचिंग:', 'స్మార్ట్ మ్యాచింగ్:'],
    'ABO compatibility (plasma = reverse ABO) + distance + ID-on-file + cooldown eligibility = match score.': ['ABO संगतता (प्लाज़्मा = उल्टा ABO) + दूरी + ID फ़ाइल में + कूलडाउन पात्रता = मैच स्कोर।', 'ABO అనుకూలత (ప్లాస్మా = రివర్స్ ABO) + దూరం + ID ఫైల్‌లో + కూల్‌డౌన్ అర్హత = మ్యాచ్ స్కోర్.'],
    'Ready': ['तैयार', 'సిద్ధం'],
    'All donations happen here. Never at home.': ['सारे दान यहीं होते हैं। घर पर कभी नहीं।', 'అన్ని దానాలు ఇక్కడే జరుగుతాయి. ఇంట్లో ఎప్పుడూ కాదు.'],
    'Contact masking': ['नंबर छिपाना', 'నంబర్ దాచడం'],
    '— phone numbers are never shown. Chat via platform only.': ['— फ़ोन नंबर कभी नहीं दिखते। चैट सिर्फ प्लेटफ़ॉर्म पर।', '— ఫోన్ నంబర్లు ఎప్పుడూ కనిపించవు. చాట్ ప్లాట్‌ఫామ్‌లోనే.'],
    'Fraud checks': ['फ्रॉड जाँच', 'మోసం తనిఖీ'],
    '— duplicates & money mentions are held for review.': ['— डुप्लिकेट और पैसे की बात वाले अनुरोध रिव्यू के लिए रोके जाते हैं।', '— డూప్లికేట్లు మరియు డబ్బు ప్రస్తావనలు సమీక్ష కోసం ఆపబడతాయి.'],
    'Bank-only': ['सिर्फ ब्लड बैंक', 'రక్త నిధి మాత్రమే'],
    '— Red Cross, Chiranjeevi, Govt & Charminar centres.': ['— रेड क्रॉस, चिरंजीवी, सरकारी और चारमीनार केंद्र।', '— రెడ్ క్రాస్, చిరంజీవి, ప్రభుత్వ మరియు చార్మినార్ కేంద్రాలు.'],
    'Images delivered with Cloudinary': ['इमेज Cloudinary से पहुँचाई जाती हैं', 'చిత్రాలు Cloudinary ద్వారా అందించబడతాయి'],
    'Blood Network • Hyderabad • For emergency assistance call 108.': ['Blood Network • हैदराबाद • इमरजेंसी मदद के लिए 108 पर कॉल करें।', 'Blood Network • హైదరాబాద్ • అత్యవసర సహాయం కోసం 108కి కాల్ చేయండి.'],
    'Donations always at authorized blood banks; matches are potential matches only.': ['दान हमेशा अधिकृत ब्लड बैंक में; मैच सिर्फ संभावित मैच हैं।', 'దానం ఎల్లప్పుడూ అధీకృత రక్త నిధిలో; మ్యాచ్‌లు సంభావ్య మ్యాచ్‌లు మాత్రమే.'],
    '© 2026 Blood Network • Made for Hyderabad': ['© 2026 Blood Network • हैदराबाद के लिए बनाया गया', '© 2026 Blood Network • హైదరాబాద్ కోసం రూపొందించబడింది'],
    '+ New SOS': ['+ नया SOS', '+ కొత్త SOS'],
    '(8 types)': ['(8 प्रकार)', '(8 రకాలు)'],
    'RBC match': ['RBC मैच', 'RBC మ్యాచ్'],
    'Like RBC': ['RBC जैसा', 'RBC లాగా'],
    'Reverse ABO': ['उल्टा ABO', 'రివర్స్ ABO'],
    'Whole blood: standard ABO match. Donor RBC must be compatible with patient.': ['होल ब्लड: सामान्य ABO मैच। डोनर का RBC मरीज़ से संगत होना चाहिए।', 'హోల్ బ్లడ్: సాధారణ ABO మ్యాచ్. దాత RBC రోగికి అనుకూలంగా ఉండాలి.'],
    'Critical': ['गंभीर', 'అత్యంత క్లిష్టం'],
    '< 2 hrs': ['< 2 घंटे', '< 2 గంటలు'],
    'Urgent': ['अर्जेंट', 'అత్యవసరం'],
    '< 6 hrs': ['< 6 घंटे', '< 6 గంటలు'],
    'Scheduled': ['निर्धारित', 'షెడ్యూల్డ్'],
    '24 hrs+': ['24 घंटे+', '24 గంటలు+'],
    'Medical report / doctor\'s slip photo': ['मेडिकल रिपोर्ट / डॉक्टर की पर्ची की फोटो', 'మెడికల్ రిపోర్ట్ / డాక్టర్ స్లిప్ ఫోటో'],
    'Stored as a private Cloudinary asset. Never shown publicly.': ['निजी Cloudinary फ़ाइल के रूप में सेव होती है। सार्वजनिक रूप से कभी नहीं दिखती।', 'ప్రైవేట్ Cloudinary ఫైల్‌గా నిల్వ చేయబడుతుంది. బహిరంగంగా ఎప్పుడూ చూపబడదు.'],
    'Anti-fraud active:': ['फ्रॉड सुरक्षा चालू:', 'మోసం నిరోధం క్రియాశీలం:'],
    'duplicate requests & money mentions are auto-held for review. Donations only at authorized banks.': ['डुप्लिकेट अनुरोध और पैसे की बात अपने आप रिव्यू के लिए रुक जाती हैं। दान सिर्फ अधिकृत बैंक में।', 'డూప్లికేట్ అభ్యర్థనలు మరియు డబ్బు ప్రస్తావనలు ఆటోమేటిక్‌గా సమీక్ష కోసం ఆపబడతాయి. దానం అధీకృత రక్త నిధిలో మాత్రమే.'],
    'By continuing you agree to bank-only donation & safe chat.': ['आगे बढ़ने पर आप सिर्फ बैंक में दान और सुरक्षित चैट के लिए सहमत हैं।', 'కొనసాగించడం ద్వారా మీరు రక్త నిధిలో మాత్రమే దానం మరియు సురక్షిత చాట్‌కు అంగీకరిస్తున్నారు.'],
    'Register • Stay available • Get alerts': ['रजिस्टर करें • उपलब्ध रहें • अलर्ट पाएँ', 'నమోదు చేయండి • అందుబాటులో ఉండండి • అలర్ట్‌లు పొందండి'],
    'You\'re not registered yet': ['आप अभी रजिस्टर नहीं हैं', 'మీరు ఇంకా నమోదు కాలేదు'],
    'Register below to get SOS alerts and track cooldown.': ['SOS अलर्ट पाने और कूलडाउन ट्रैक करने के लिए नीचे रजिस्टर करें।', 'SOS అలర్ట్‌లు పొందడానికి మరియు కూల్‌డౌన్ ట్రాక్ చేయడానికి క్రింద నమోదు చేయండి.'],
    '✓ Masked phone': ['✓ छिपा हुआ फ़ोन', '✓ దాచిన ఫోన్'],
    '✓ Bank-only': ['✓ सिर्फ ब्लड बैंक', '✓ రక్త నిధి మాత్రమే'],
    'Next eligible date = last donation + cooldown. Ineligible donors get lower match scores.': ['अगली पात्र तारीख = पिछला दान + कूलडाउन। अपात्र डोनर का मैच स्कोर कम होता है।', 'తదుపరి అర్హత తేదీ = చివరి దానం + కూల్‌డౌన్. అనర్హ దాతలకు మ్యాచ్ స్కోర్ తక్కువగా ఉంటుంది.'],
    'Demo inbox: alerts are in-app records only, nothing is sent by SMS or WhatsApp.': ['डेमो इनबॉक्स: अलर्ट सिर्फ ऐप के अंदर के रिकॉर्ड हैं, SMS या WhatsApp से कुछ नहीं जाता।', 'డెమో ఇన్‌బాక్స్: అలర్ట్‌లు యాప్‌లోని రికార్డులు మాత్రమే, SMS లేదా WhatsApp ద్వారా ఏమీ పంపబడదు.'],
    'All clear - no alerts for this donor yet': ['सब ठीक - इस डोनर के लिए अभी कोई अलर्ट नहीं', 'అంతా సరే - ఈ దాతకు ఇంకా అలర్ట్‌లు లేవు'],
    'Compatible SOS alerts will appear here.': ['संगत SOS अलर्ट यहाँ दिखेंगे।', 'అనుకూల SOS అలర్ట్‌లు ఇక్కడ కనిపిస్తాయి.'],
    'Numbers stay masked. Chat only.': ['नंबर छिपे रहते हैं। सिर्फ चैट।', 'నంబర్లు దాచబడతాయి. చాట్ మాత్రమే.'],
    '(leave empty if never)': ['(कभी नहीं किया तो खाली छोड़ें)', '(ఎప్పుడూ చేయకపోతే ఖాళీగా వదలండి)'],
    'Government ID photo': ['सरकारी ID की फोटो', 'ప్రభుత్వ ID ఫోటో'],
    '(optional, stored privately on Cloudinary)': ['(वैकल्पिक, Cloudinary पर निजी रूप से सेव)', '(ఐచ్ఛికం, Cloudinaryలో ప్రైవేట్‌గా నిల్వ)'],
    'Public view shows only a face-blurred thumbnail, labelled "ID uploaded (not verified)".': ['सार्वजनिक व्यू में सिर्फ चेहरा धुंधला थंबनेल दिखता है, "ID अपलोड (सत्यापित नहीं)" लिखा होता है।', 'పబ్లిక్ వీక్షణలో ముఖం బ్లర్ చేసిన థంబ్‌నెయిల్ మాత్రమే కనిపిస్తుంది, "ID అప్‌లోడ్ చేయబడింది (ధృవీకరించబడలేదు)" అని లేబుల్ ఉంటుంది.'],
    'All': ['सभी', 'అన్నీ'],
    'Contact masking • Fraud checks • Review queue. Numbers are never revealed.': ['नंबर छिपाना • फ्रॉड जाँच • रिव्यू क्यू। नंबर कभी नहीं दिखाए जाते।', 'నంబర్ దాచడం • మోసం తనిఖీ • సమీక్ష క్యూ. నంబర్లు ఎప్పుడూ వెల్లడించబడవు.'],
    'Contact masking:': ['नंबर छिपाना:', 'నంబర్ దాచడం:'],
    'No phone numbers anywhere. “Contact via platform” chat only. Meet solely at banks.': ['कहीं भी फ़ोन नंबर नहीं। सिर्फ “प्लेटफ़ॉर्म से संपर्क” चैट। सिर्फ बैंक में मिलें।', 'ఎక్కడా ఫోన్ నంబర్లు లేవు. “ప్లాట్‌ఫామ్ ద్వారా సంప్రదించండి” చాట్ మాత్రమే. రక్త నిధుల వద్ద మాత్రమే కలవండి.'],
    'Fraud checks:': ['फ्रॉड जाँच:', 'మోసం తనిఖీ:'],
    'Duplicate SOS (same patient, group, area & number in 6h), 3+ from one number & money words (cash, pay, ₹, UPI…) auto-held.': ['डुप्लिकेट SOS (6 घंटे में वही मरीज़, ग्रुप, इलाका और नंबर), एक नंबर से 3+ और पैसे के शब्द (cash, pay, ₹, UPI…) अपने आप रुक जाते हैं।', 'డూప్లికేట్ SOS (6 గంటల్లో అదే రోగి, గ్రూప్, ప్రాంతం & నంబర్), ఒక నంబర్ నుండి 3+ మరియు డబ్బు పదాలు (cash, pay, ₹, UPI…) ఆటోమేటిక్‌గా ఆపబడతాయి.'],
    'Review:': ['रिव्यू:', 'సమీక్ష:'],
    'Held requests alert nobody until a reviewer clears them. 2 user reports auto-flag a donor or request.': ['रुके हुए अनुरोध रिव्यूअर के क्लियर करने तक किसी को अलर्ट नहीं भेजते। 2 यूज़र रिपोर्ट पर डोनर या अनुरोध अपने आप फ़्लैग हो जाता है।', 'ఆపిన అభ్యర్థనలు సమీక్షకుడు క్లియర్ చేసే వరకు ఎవరికీ అలర్ట్ పంపవు. 2 యూజర్ రిపోర్ట్‌లకు దాత లేదా అభ్యర్థన ఆటోమేటిక్‌గా ఫ్లాగ్ అవుతుంది.'],
    'asked for money': ['पैसे माँगे', 'డబ్బు అడిగారు'],
    'fake profile': ['फ़र्ज़ी प्रोफ़ाइल', 'నకిలీ ప్రొఫైల్'],
    'spam': ['स्पैम', 'స్పామ్'],
    'wrong blood group': ['गलत ब्लड ग्रुप', 'తప్పు రక్త గ్రూప్'],
    'Held requests • reviewer can clear': ['रुके हुए अनुरोध • रिव्यूअर क्लियर कर सकता है', 'ఆపిన అభ్యర్థనలు • సమీక్షకుడు క్లియర్ చేయవచ్చు'],
    '✓ Queue clear. No held requests.': ['✓ क्यू साफ़। कोई रुका हुआ अनुरोध नहीं।', '✓ క్యూ ఖాళీ. ఆపిన అభ్యర్థనలు లేవు.'],
    'Reports go to admin review queue.': ['रिपोर्ट एडमिन रिव्यू क्यू में जाती हैं।', 'రిపోర్ట్‌లు అడ్మిన్ సమీక్ష క్యూకి వెళ్తాయి.'],
    'Welcome to Blood Network Hyderabad': ['Blood Network हैदराबाद में आपका स्वागत है', 'Blood Network హైదరాబాద్‌కు స్వాగతం'],
    'e.g., Apollo Hospitals, Jubilee Hills': ['जैसे, अपोलो हॉस्पिटल, जुबली हिल्स', 'ఉదా., అపోలో హాస్పిటల్స్, జూబ్లీ హిల్స్'],
    'Ward / doctor / attender info. Never mention money.': ['वार्ड / डॉक्टर / अटेंडर की जानकारी। पैसे की बात कभी न लिखें।', 'వార్డ్ / డాక్టర్ / అటెండర్ వివరాలు. డబ్బు గురించి ఎప్పుడూ రాయవద్దు.'],
    'What happened? e.g., asked for ₹2000…': ['क्या हुआ? जैसे, ₹2000 माँगे…', 'ఏమైంది? ఉదా., ₹2000 అడిగారు…'],
    'Describe: asked for money / fake profile…': ['बताएँ: पैसे माँगे / फ़र्ज़ी प्रोफ़ाइल…', 'వివరించండి: డబ్బు అడిగారు / నకిలీ ప్రొఫైల్…'],
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
    'e.g., Apollo Hospitals, Jubilee Hills': ['जैसे, अपोलो हॉस्पिटल, जुबली हिल्स', 'ఉదా., అపోలో హాస్పిటల్స్, జూబ్లీ హిల్స్'],
    'Ward / doctor / attender info. Never mention money.': ['वार्ड / डॉक्टर / अटेंडर की जानकारी। पैसे की बात कभी न लिखें।', 'వార్డ్ / డాక్టర్ / అటెండర్ వివరాలు. డబ్బు గురించి ఎప్పుడూ రాయవద్దు.'],
    'What happened? e.g., asked for ₹2000…': ['क्या हुआ? जैसे, ₹2000 माँगे…', 'ఏమైంది? ఉదా., ₹2000 అడిగారు…'],
    'Describe: asked for money / fake profile…': ['बताएँ: पैसे माँगे / फ़र्ज़ी प्रोफ़ाइल…', 'వివరించండి: డబ్బు అడిగారు / నకిలీ ప్రొఫైల్…'],
    'e.g., Lakshmi Rao': ['जैसे, लक्ष्मी राव', 'ఉదా., లక్ష్మి రావు'], '10 digit mobile': ['10 अंक का मोबाइल', '10 అంకెల మొబైల్'],
    'Type a safe message…': ['सुरक्षित मैसेज लिखें…', 'సురక్షిత సందేశం టైప్ చేయండి…'],
    'Search name or area…': ['नाम या इलाका खोजें…', 'పేరు లేదా ప్రాంతం వెతకండి…'], 'Full name *': ['पूरा नाम *', 'పూర్తి పేరు *']
  };
  var LANGS = ['en', 'hi', 'te'];
  var cur = 'en', busy = false, store = new WeakMap(), pstore = new WeakMap();
  var norm = function (s) { return s.replace(/\s+/g, ' ').trim(); };
  var idx = function (l) { return l === 'hi' ? 0 : 1; };

  // Strings with a number inside: matched by pattern, number kept as is.
  var DYN = [
    [/^Cooldown (\d+)d$/, function (n) { return ['कूलडाउन ' + n + ' दिन', 'కూల్‌డౌన్ ' + n + ' రోజులు']; }],
    [/^(\d+) shown$/, function (n) { return [n + ' दिख रहे', n + ' చూపబడుతున్నాయి']; }]
  ];
  function dyn(key) {
    for (var i = 0; i < DYN.length; i++) { var m = key.match(DYN[i][0]); if (m) return DYN[i][1](m[1]); }
    return null;
  }
  function tNode(n) {
    var rec = store.get(n);
    if (rec && n.nodeValue !== rec.applied) rec = null; // text changed by the app: new original
    var orig = rec ? rec.orig : n.nodeValue;
    var key = norm(orig);
    if (cur === 'en') { if (rec) { n.nodeValue = rec.orig; store.delete(n); } return; }
    var tr = D[key] || dyn(key);
    if (!tr) return;
    var m = orig.match(/^(\s*)[\s\S]*?(\s*)$/);
    var out = m[1] + tr[idx(cur)] + m[2];
    store.set(n, { orig: orig, applied: out });
    if (n.nodeValue !== out) n.nodeValue = out; // writing an identical value still queues a mutation record and loops the observer
  }
  function tPlaceholder(el) {
    var rec = pstore.get(el);
    var orig = rec && el.getAttribute('placeholder') === rec.applied ? rec.orig : el.getAttribute('placeholder');
    if (cur === 'en') { if (rec) { el.setAttribute('placeholder', rec.orig); pstore.delete(el); } return; }
    var tr = P[orig]; if (!tr) return;
    var out = tr[idx(cur)]; pstore.set(el, { orig: orig, applied: out }); if (el.getAttribute('placeholder') !== out) el.setAttribute('placeholder', out);
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
