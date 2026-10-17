/** Build: npx tailwindcss@3 -c tailwind.config.js -i tailwind.input.css -o tw.css --minify */
module.exports = {
  content: ['./index.html', './app.js', './voice.html', './landing.html'],
  theme: {extend:{colors:{primary:'#b3001b',primaryDark:'#7a0013',primaryLight:'#FFF0F1',primaryMid:'#e11d2e'},fontFamily:{sans:['Plus Jakarta Sans','Inter','system-ui','sans-serif']},boxShadow:{card:'0 8px 30px rgba(179,0,27,0.08)',pop:'0 20px 60px rgba(0,0,0,0.18)',red:'0 10px 30px rgba(179,0,27,0.28)'}}},
};
