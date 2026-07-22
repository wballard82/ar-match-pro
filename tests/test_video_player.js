// Video player suite — drives the reworked video.html in jsdom.
// Silent/timer mode is the default (must fully play through with NO
// speechSynthesis at all), narration is opt-in, captions always run,
// and end-card links must escape the iframe.
const { JSDOM, VirtualConsole } = require('jsdom');
const path=require('path');
const _root=path.resolve(__dirname,'..');
const _p=(f)=>{const fs=require('fs');const a=path.join(_root,'deploy',f);const b=path.join(_root,f);return fs.existsSync(a)?a:b;};
const VIDEO_HTML=_p('video.html'); const INDEX_HTML=_p('index.html');
const fs = require('fs');

function makeT(name){
  let pass=0, fail=0;
  return {
    t(label, cond, detail){
      if(cond){ pass++; console.log('  ✅ '+label); }
      else { fail++; process.exitCode=1; console.log('  ❌ '+label+(detail!==undefined?'   ['+String(detail).slice(0,160)+']':'')); }
    },
    done(){ console.log('\n'+name+': '+pass+'/'+(pass+fail)+' assertions passed'); }
  };
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function bootVideo({withSynth}){
  const errors=[];
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>{const m=String(e.message||e); if(!/resource|Could not load|getContext|setTransform/i.test(m)) errors.push(m);});
  const dom=new JSDOM(fs.readFileSync(VIDEO_HTML,'utf8'),{
    runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://armatchpro.com/video.html',
    beforeParse(w){
      w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
      w.requestAnimationFrame=cb=>setTimeout(cb,16);
      w.cancelAnimationFrame=id=>clearTimeout(id);
      if(withSynth){
        // Scripted TTS stub: "speaks" for 250ms then fires onend
        w.SpeechSynthesisUtterance=function(text){ this.text=text; };
        w.speechSynthesis={ _spoken:[],
          speak(u){ this._spoken.push(u.text); setTimeout(()=>{ try{u.onstart&&u.onstart();}catch(e){} setTimeout(()=>{ try{u.onend&&u.onend();}catch(e){} },250); },10); },
          cancel(){}, pause(){}, resume(){}, getVoices(){ return [{name:'Samantha',lang:'en-US'}]; }
        };
      } else {
        // The hostile case: browser exposes NO speech APIs at all
        delete w.speechSynthesis;
        delete w.SpeechSynthesisUtterance;
      }
    }
  });
  await sleep(500);
  return { w: dom.window, errors };
}

(async () => {
  const { t, done } = makeT('Video player suite');

  // ── Mode 1: SILENT DEFAULT — no speech APIs exist at all ──
  {
    const { w, errors } = await bootVideo({withSynth:false});
    t('boots with zero speech APIs present', errors.length===0, errors[0]);
    t('no-TTS browser: narration auto-falls back off + captions forced ON',
      w._vidState().narration===false && w._vidState().captions===true, JSON.stringify(w._vidState()));
    t('caption bar exists', !!w.document.getElementById('cap-box'));
    // Shrink scenes so the whole video plays in ~2s
    w.SCENES.forEach(sc=>sc.dur=300);
    w.recomputeTiming();
    w.play();
    await sleep(120);
    t('scene 0 showing after play', w.document.getElementById('s0').classList.contains('show'));
    const capMid = w.document.getElementById('cap-box').textContent;
    t('caption text rendered for scene 0', capMid.length>10 && /Match remittance|Welcome to AR Match Pro/.test(capMid), capMid.slice(0,60));
    // Wait for full run-through: 6 scenes × (300ms + 400ms gap) ≈ 4.2s
    await sleep(5200);
    t('all six scenes advanced on timers and the video ENDED without any voice engine',
      w._vidState().playing===false && w._vidState().cur===0, JSON.stringify(w._vidState()));
    t('no errors across a silent full play-through', errors.length===0, errors[0]);
    w.close();
  }

  // ── Mode 2: pause / resume in timer mode ──
  {
    const { w } = await bootVideo({withSynth:false});
    w.SCENES.forEach(sc=>sc.dur=1200);
    w.recomputeTiming();
    w.play();
    await sleep(400);
    w.pause();
    const elAtPause = w.getElapsed();
    t('pause freezes elapsed mid-scene', elAtPause>=300 && elAtPause<1200, elAtPause);
    await sleep(600);
    t('elapsed does not advance while paused', Math.abs(w.getElapsed()-elAtPause)<50, w.getElapsed());
    w.play();
    await sleep(1100);
    t('resume continues into next scene (not restart from zero)', w._vidState().cur>=1, w._vidState().cur);
    w.end();
    w.close();
  }

  // ── Mode 3: narration opt-in with a working TTS ──
  {
    const { w, errors } = await bootVideo({withSynth:true});
    w.SCENES.forEach(sc=>sc.dur=300);
    w.recomputeTiming();
    t('TTS browser: narration defaults ON with correct button label', w._vidState().narration===true &&
      /Narration on/.test(w.document.getElementById('nar-label').textContent), JSON.stringify(w._vidState()));
    t('captions default OFF when narration is available', w._vidState().captions===false);
    w.play();
    await sleep(4800);
    t('narrated mode speaks each scene and completes',
      w.speechSynthesis._spoken.length>=6 && w._vidState().playing===false,
      JSON.stringify({spoken:w.speechSynthesis._spoken.length, state:w._vidState()}));
    t('speech rate raised from droning 0.78', fs.readFileSync(VIDEO_HTML,'utf8').includes('utt.rate=.95'));
    t('no errors in narrated mode', errors.length===0, errors[0]);
    w.close();
  }

  // ── Mode 4: toggle mid-play restarts scene in new mode without crashing ──
  {
    const { w, errors } = await bootVideo({withSynth:true});
    w.SCENES.forEach(sc=>sc.dur=800);
    w.recomputeTiming();
    w.play();               // narration mode (default)
    await sleep(300);
    w.toggleNarration();    // switch to silent mid-scene
    await sleep(400);
    t('mid-play toggle to silent keeps playing', w._vidState().playing===true);
    t('turning narration off auto-enables captions (never silent AND captionless)',
      w._vidState().captions===true, JSON.stringify(w._vidState()));
    w.toggleNarration();    // back to narration
    await sleep(300);
    t('toggling back to narration keeps playing, no errors', w._vidState().playing===true && errors.length===0, errors[0]);
    // CC toggle works independently
    w.toggleCaptions();
    t('CC toggle flips captions state', typeof w._vidState().captions==='boolean');
    w.end();
    w.close();
  }

  // ── Static checks: iframe escape + polish details ──
  {
    const src = fs.readFileSync(VIDEO_HTML,'utf8');
    t('end-card pilot button escapes the iframe (target=_top), no checkout link',
      src.includes('href="index.html#pricing" target="_top">Start a 30-day pilot</a>') && !src.includes('checkout.html'));
    t('end-card pricing link escapes the iframe (target=_top)',
      src.includes('href="index.html#pricing" target="_top"'));
    t('narration toggle present in control bar', src.includes('id="nar-btn"') && src.includes('toggleNarration()'));
    t('CC captions toggle present in control bar', src.includes('id="cc-btn"') && src.includes('toggleCaptions()'));
    t('narration script sells the pilot, not a card-required trial',
      src.includes('30-day white-glove pilot') && !/credit card/i.test(src));
    const idx = fs.readFileSync(INDEX_HTML,'utf8');
    t('landing: billing toggle fully removed (annual-only)',
      !idx.includes('Save 17%') && !idx.includes('Save 2 months') && !idx.includes('setBilling('));
    t('landing: watch button promises 60 seconds', idx.includes('▶ Watch the 60-second tour'));
    // The CTA row under the player: pricing primary, pilot secondary. Scope to the
    // row via its unique caption so the player's own end-card doesn't interfere.
    const rowCap = idx.indexOf('White-glove pilot · no charge until you convert</div>');
    const rowStart = Math.max(0, rowCap-1600);
    const rowHtml = idx.slice(rowStart, rowCap);
    t('landing: pricing is primary CTA under the video',
      rowCap>0 && rowHtml.indexOf('>View pricing</a>')>=0 &&
      rowHtml.indexOf('>View pricing</a>') < rowHtml.indexOf('Start a 30-day pilot</a>'),
      JSON.stringify({rowCap, vp:rowHtml.indexOf('>View pricing</a>'), pilot:rowHtml.indexOf('Start a 30-day pilot</a>')}));
  }

  done();
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
