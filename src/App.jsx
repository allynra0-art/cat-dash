import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, configured } from './supabase';

const CATS = ['orange', 'white', 'black', 'gray'];
const LABELS = {
  orange: 'Oren',
  white: 'Putih',
  black: 'Hitam',
  gray: 'Abu-abu',
};

// ALUR TUTORIAL: Home -> Create -> Host -> Join -> Profile
const TOUR_FLOWS = {
  home: [
    {
      id: 'tour-btn-suara',
      title: 'Atur Suara 🔊',
      desc: 'Klik di sini untuk menyalakan/mematikan suara. Jika tidak ada suara, klik 2x.',
    },
    {
      id: 'tour-btn-kuis',
      title: 'Buat Kuis ✎',
      desc: 'Klik di sini untuk mulai membuat soal kuis baru.',
    },
    {
      id: 'tour-btn-bersama',
      title: 'Main Bersama 📚',
      desc: 'Klik ini untuk bikin room, pilih kucing, dan main dengan teman.',
    },
    {
      id: 'tour-btn-gabung',
      title: 'Gabung Room ⌨️',
      desc: 'Punya kode 6 digit dari teman? Klik di sini buat masuk.',
    },
    {
      id: 'tour-btn-profil',
      title: 'Profil 👤',
      desc: 'Klik ikon ini untuk mengubah nama atau keluar dari akun.',
    },
  ],
  create: [
    {
      id: 'tour-input-judul',
      title: 'Judul Kuis',
      desc: 'Mulai dengan memberi judul pada kuis buatanmu.',
    },
    {
      id: 'tour-pilih-tipe',
      title: '3 Variasi Soal 📝',
      desc: 'Pilih tipe soal: Pilihan Ganda, Benar/Salah, atau Isian Singkat.',
    },
    {
      id: 'tour-input-soal',
      title: 'Tulis Pertanyaan',
      desc: 'Ketik soal di sini. Form jawaban di bawahnya otomatis menyesuaikan.',
    },
    {
      id: 'tour-btn-hapus-soal',
      title: 'Hapus Soal 🗑',
      desc: 'Salah buat soal? Klik tombol ini untuk menghapusnya.',
    },
    {
      id: 'tour-btn-tambah-soal',
      title: 'Tambah Soal ➕',
      desc: 'Klik untuk menambah soal baru (maksimal 50 soal).',
    },
    {
      id: 'tour-btn-simpan',
      title: 'Simpan Kuis',
      desc: 'Jika sudah selesai, klik simpan untuk menyimpan kuis ke database.',
    },
  ],
  host: [
    {
      id: 'tour-pilih-kucing',
      title: 'Pilih Kucing 🐾',
      desc: 'Pilih karakter kucing yang mau kamu pakai.',
    },
    {
      id: 'tour-pilih-kuis',
      title: 'Pilih Kuis',
      desc: 'Pilih kuis yang mau dimainkan. Sudah ada "Simulasi Kuis" yang siap dipakai untuk mencoba.',
    },
    {
      id: 'tour-input-bot',
      title: 'Lawan Bot 🤖',
      desc: 'Isi angka 0-5. Kalau kamu main sendirian, tambahkan Bot sebagai lawan.',
    },
    {
      id: 'tour-input-timer',
      title: 'Waktu Kuis ⏱️',
      desc: 'Atur berapa detik waktu untuk menjawab setiap soal (5-60 detik).',
    },
    {
      id: 'tour-btn-buat-room',
      title: 'Buat Room',
      desc: 'Klik di sini untuk membuat kode room dan mulai bermain.',
    },
  ],
  join: [
    {
      id: 'tour-input-kode',
      title: 'Kode Room',
      desc: 'Masukkan 6 digit kode room dari temanmu.',
    },
    {
      id: 'tour-btn-gabung-sekarang',
      title: 'Gabung',
      desc: 'Klik di sini untuk masuk ke lobby balapan.',
    },
  ],
  profile: [
    {
      id: 'tour-input-nama',
      title: 'Ubah Nickname',
      desc: 'Ketik nama barumu di sini.',
    },
    {
      id: 'tour-btn-simpan-profil',
      title: 'Simpan Nama',
      desc: 'Klik untuk menyimpan perubahan nama.',
    },
    {
      id: 'tour-btn-logout',
      title: 'Keluar',
      desc: 'Klik di sini jika ingin keluar atau ganti akun.',
    },
  ],
};

// URUTAN PINDAH HALAMAN TUTORIAL
const NEXT_TOUR_FLOW = {
  home: { screen: 'create', label: 'Buat Kuis' },
  create: { screen: 'host', label: 'Main Bersama' },
  host: { screen: 'join', label: 'Gabung Room' },
  join: { screen: 'profile', label: 'Profil' },
};

// Ukuran lintasan (harus sama dengan CSS patch)
const LANE_HEIGHT = 64;
const LANE_GAP = 6;
const LANES_TOP = 200;
const MOBILE_LANE_HEIGHT = 50;
const MOBILE_LANE_GAP = 5;
const MOBILE_LANES_TOP = 92;
const MOBILE_QUERY = '(max-width: 650px)';

let questionKeySeed = 0;
const blank = () => ({
  _key: ++questionKeySeed, // key stabil supaya hapus soal tidak mengacak form
  prompt: '',
  type: 'pg',
  options: ['', '', '', ''],
  correct_index: 0,
  correct_text: '',
});
const msg = (e) => e?.message || String(e);

// ===== VALIDASI EMAIL: hanya email penyedia resmi / sekolah yang boleh masuk =====
const ALLOW_GUEST = false; // true = tampilkan lagi tombol "Main sebagai Tamu"
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.id',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
];
const ALLOWED_EMAIL_SUFFIXES = ['.sch.id', '.ac.id', '.edu'];
const EMAIL_REGEX =
  /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/;

function validateEmail(email) {
  const m = EMAIL_REGEX.exec(email);
  if (!m || email.includes('..'))
    return 'Format email tidak valid. Contoh: namamu@gmail.com';
  const domain = m[1];
  const ok =
    ALLOWED_EMAIL_DOMAINS.includes(domain) ||
    ALLOWED_EMAIL_SUFFIXES.some((suffix) => domain.endsWith(suffix));
  if (!ok)
    return 'Gunakan email dari Gmail, Yahoo, Outlook, iCloud, atau email sekolah/kampus (contoh: namamu@gmail.com).';
  return '';
}

// ===== KUIS SIMULASI BAWAAN (otomatis dibuat untuk user yang belum punya kuis) =====
const SAMPLE_QUIZ_TITLE = '🎮 Simulasi Kuis: Pengetahuan Umum';
const SAMPLE_QUESTIONS = [
  { type: 'pg', prompt: "Berapa hasil 7 + 8?", options: ["13", "14", "15", "16"], correct_index: 2 },
  { type: 'pg', prompt: "Planet yang paling dekat dengan Matahari adalah...", options: ["Merkurius", "Venus", "Bumi", "Mars"], correct_index: 0 },
  { type: 'pg', prompt: "Campuran warna merah dan kuning menghasilkan warna...", options: ["Hijau", "Oranye", "Ungu", "Biru"], correct_index: 1 },
  { type: 'pg', prompt: "Hewan berikut yang berkembang biak dengan cara bertelur adalah...", options: ["Kucing", "Ayam", "Sapi", "Kambing"], correct_index: 1 },
  { type: 'pg', prompt: "Berapa jumlah hari dalam seminggu?", options: ["5", "6", "7", "8"], correct_index: 2 },
  { type: 'pg', prompt: "Ibu kota negara Prancis adalah...", options: ["London", "Paris", "Roma", "Berlin"], correct_index: 1 },
  { type: 'pg', prompt: "Alat yang dipakai untuk melihat bintang dan benda langit yang jauh adalah...", options: ["Mikroskop", "Teleskop", "Periskop", "Termometer"], correct_index: 1 },
  { type: 'pg', prompt: "Benda langit yang tampak menerangi bumi pada malam hari adalah...", options: ["Matahari", "Komet", "Bulan", "Meteor"], correct_index: 2 },
  { type: 'pg', prompt: "Berapa hasil 9 x 6?", options: ["52", "54", "56", "48"], correct_index: 1 },
  { type: 'pg', prompt: "Hewan yang bernapas dengan insang adalah...", options: ["Ikan", "Kelinci", "Burung", "Kambing"], correct_index: 0 },
  { type: 'pg', prompt: "Matahari terbit dari arah...", options: ["Barat", "Timur", "Utara", "Selatan"], correct_index: 1 },
  { type: 'pg', prompt: "Hewan terbesar di dunia adalah...", options: ["Gajah", "Jerapah", "Paus biru", "Hiu"], correct_index: 2 },
  { type: 'pg', prompt: "Air membeku pada suhu...", options: ["100 derajat Celsius", "0 derajat Celsius", "50 derajat Celsius", "-10 derajat Celsius"], correct_index: 1 },
  { type: 'pg', prompt: "Berapa hasil 100 - 45?", options: ["45", "65", "55", "50"], correct_index: 2 },
  { type: 'pg', prompt: "Berapa jumlah kaki pada seekor laba-laba?", options: ["6", "8", "10", "4"], correct_index: 1 },
];

async function seedSampleQuiz(ownerId) {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ owner_id: ownerId, title: SAMPLE_QUIZ_TITLE })
    .select('id')
    .single();
  if (error) throw error;
  const { error: qe } = await supabase.from('quiz_questions').insert(
    SAMPLE_QUESTIONS.map((q, i) => ({
      quiz_id: data.id,
      position: i,
      prompt: q.prompt,
      type: q.type,
      options: q.options,
      correct_index: q.correct_index,
    }))
  );
  if (qe) {
    await supabase.from('quizzes').delete().eq('id', data.id);
    throw qe;
  }
  return data.id;
}

const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(Number(ms) || 0));
  const minutes = String(Math.floor(total / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((total % 60000) / 1000)).padStart(2, '0');
  const centis = String(Math.floor((total % 1000) / 10)).padStart(2, '0');
  return `${minutes}:${seconds}.${centis}`;
};

let audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function sound(type, enabled) {
  if (!enabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const notes = {
      click: [520, 680],
      correct: [523, 659, 784],
      wrong: [240, 190],
      finish: [523, 659, 784, 1046],
      start: [392, 587],
      tick: [440],
      go: [523, 784, 1046],
    }[type] || [500];
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.09;
      osc.type = type === 'click' || type === 'start' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      ctx.destination && gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch {}
}

function Cat({ cat = 'orange', action = 'idle', size = 88 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cat, action]);
  const src = `/assets/characters/cat_${cat}_${action}.png`;

  return failed ? (
    <span
      className="catMissing"
      style={{ width: size, height: size }}
      aria-label="Sprite tidak ditemukan"
    />
  ) : (
    <img
      className="cat"
      src={src}
      alt={`Kucing ${LABELS[cat]}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [screen, setScreen] = useState('home');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Deteksi layar HP (breakpoint sama dengan CSS) supaya tinggi arena balapan pas
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // TUTORIAL STATE
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialFlow, setTutorialFlow] = useState('home');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const [isGuest, setIsGuest] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem('catdash_sound') !== 'off'
  );
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const menuBgmRef = useRef(null);
  const raceBgmRef = useRef(null);

  const [name, setName] = useState(
    () => localStorage.getItem('catdash_name') || ''
  );
  const [cat, setCat] = useState('orange');

  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([blank()]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [botCount, setBotCount] = useState(3);
  const [timeLimit, setTimeLimit] = useState(15);
  const [localBots, setLocalBots] = useState([]);

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);

  const [sprinting, setSprinting] = useState(false);
  const [stepHint, setStepHint] = useState(
    'Tekan D atau klik LARI untuk berlari!'
  );

  const [raceStartTime, setRaceStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [quizSeconds, setQuizSeconds] = useState(15);
  const [showResults, setShowResults] = useState(false);
  const [shortAnswerInput, setShortAnswerInput] = useState('');

  const [isShaking, setIsShaking] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  // ===== COUNTDOWN & PANDUAN CARA MAIN =====
  const [showHowTo, setShowHowTo] = useState(false);
  const [countdown, setCountdown] = useState(null); // 3,2,1,0(GO) atau null
  const [raceReady, setRaceReady] = useState(false);
  const countdownStartedRef = useRef(false);
  const seedingRef = useRef(false);

  // ===== LAYAR SELAMAT SEBELUM PODIUM =====
  const [showCongrats, setShowCongrats] = useState(false);
  const [finalMs, setFinalMs] = useState(0);

  // ===== PESAN SELAMAT DATANG =====
  const [showWelcome, setShowWelcome] = useState(false);
  const [hideWelcome, setHideWelcome] = useState(false); // "jangan tampilkan lagi"
  const welcomeShownRef = useRef(false);

  const moveRef = useRef({
    sprinting: false,
    sendingStep: false,
    pendingStep: false,
  });
  const quizKey = useRef('');
  const finishedRef = useRef(false);
  const busyRef = useRef(false);
  const answerRef = useRef(null);
  const quizTimeoutRef = useRef(false);

  const allPlayersRaw = [...players, ...localBots];
  const rankedPlayers = [...allPlayersRaw].sort((a, b) => {
    const af = a.finished_at ? new Date(a.finished_at).getTime() : Infinity;
    const bf = b.finished_at ? new Date(b.finished_at).getTime() : Infinity;
    if (af !== bf) return af - bf;
    return Number(b.distance) - Number(a.distance);
  });

  // Kucing kita selalu di lintasan paling bawah (paling depan)
  const lanePlayers = [...allPlayersRaw].sort((a, b) => {
    if (a.user_id === uid) return 1;
    if (b.user_id === uid) return -1;
    return a.id.localeCompare(b.id);
  });

  const me = rankedPlayers.find((p) => p.user_id === uid);
  const isHost = room?.host_id === uid;
  const myEnergy = Math.max(0, Math.min(100, Number(me?.energy || 0)));
  const energyClass =
    myEnergy <= 0
      ? 'empty'
      : myEnergy < 25
      ? 'low'
      : myEnergy < 50
      ? 'mid'
      : '';
  const myPosition = Math.max(
    1,
    rankedPlayers.findIndex((p) => p.user_id === uid) + 1
  );

  const congratsText =
    myPosition === 1
      ? 'Juara 1! Kucingmu paling cepat dan paling pintar! 🥇'
      : myPosition === 2
      ? 'Juara 2! Sedikit lagi jadi yang pertama! 🥈'
      : myPosition === 3
      ? 'Juara 3! Kamu masuk podium! 🥉'
      : 'Kamu berhasil sampai garis finish! Terus berlatih ya! 💪';

  // Tinggi area balapan menyesuaikan jumlah lintasan supaya tidak ada kucing yang terpotong
  const sceneryMinHeight = isMobile
    ? MOBILE_LANES_TOP +
      lanePlayers.length * (MOBILE_LANE_HEIGHT + MOBILE_LANE_GAP) +
      12
    : LANES_TOP + lanePlayers.length * (LANE_HEIGHT + LANE_GAP) + 16;

  const fx = (type) => sound(type, soundOn);
  const rpc = async (fn, args) => {
    const { data, error: e } = await supabase.rpc(fn, args);
    if (e) throw e;
    return data;
  };

  const run = async (fn) => {
    setError('');
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const m = msg(e);
      if (m.includes('duplicate key'))
        setError('Data sudah ada, silakan gunakan nama lain.');
      else setError(m);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // ===== LOGIKA TUTORIAL SPOTLIGHT INTERAKTIF =====
  useEffect(() => {
    if (!showTutorial) return;

    if (TOUR_FLOWS[screen] && tutorialFlow !== screen) {
      setTutorialFlow(screen);
      setTutorialStep(0);
    }

    const updateTargetRect = () => {
      const currentFlow = TOUR_FLOWS[tutorialFlow];
      if (!currentFlow || !currentFlow[tutorialStep]) return;

      const el = document.getElementById(currentFlow[tutorialStep].id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        }, 300);
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [showTutorial, tutorialStep, screen, tutorialFlow]);

  const startTutorial = () => {
    setScreen('home');
    setTutorialFlow('home');
    setTutorialStep(0);
    setShowTutorial(true);
    fx('click');
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setTargetRect(null);
    if (uid) localStorage.setItem(`catdash_tutorial_seen_${uid}`, 'true');
    fx('click');
  };

  const nextTutorialStep = () => {
    const currentFlow = TOUR_FLOWS[tutorialFlow];
    if (tutorialStep < currentFlow.length - 1) {
      setTutorialStep((prev) => prev + 1);
      fx('click');
    } else {
      closeTutorial();
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep((prev) => prev - 1);
      fx('click');
    }
  };

  const goToNextTutorialPage = () => {
    const next = NEXT_TOUR_FLOW[tutorialFlow];
    if (next) {
      setScreen(next.screen);
      setTutorialFlow(next.screen);
      setTutorialStep(0);
      fx('click');
    }
  };

  // Muat preferensi "jangan tampilkan lagi" milik user yang sedang login
  useEffect(() => {
    if (!uid) {
      setHideWelcome(false);
      return;
    }
    setHideWelcome(localStorage.getItem(`catdash_hide_welcome_${uid}`) === 'true');
  }, [uid]);

  // Tampilkan pesan selamat datang SEKALI setiap aplikasi dibuka / user login
  useEffect(() => {
    if (!uid) {
      welcomeShownRef.current = false;
      setShowWelcome(false);
      return;
    }
    if (screen !== 'home' || welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    if (localStorage.getItem(`catdash_hide_welcome_${uid}`) === 'true') return;
    setShowWelcome(true);
  }, [screen, uid]);

  const toggleHideWelcome = (hide) => {
    setHideWelcome(hide);
    if (!uid) return;
    if (hide) localStorage.setItem(`catdash_hide_welcome_${uid}`, 'true');
    else localStorage.removeItem(`catdash_hide_welcome_${uid}`);
  };

  const closeWelcome = (withTutorial) => {
    setShowWelcome(false);
    fx('click');
    if (withTutorial) startTutorial();
  };

  // ===== BGM & GAMEPLAY =====
  useEffect(() => {
    const isRacing = screen === 'room' && room?.status === 'racing';
    if (menuBgmRef.current) menuBgmRef.current.pause();
    if (raceBgmRef.current) raceBgmRef.current.pause();
    if (soundOn) {
      if (isRacing) {
        if (raceBgmRef.current) {
          raceBgmRef.current.volume = 0.2;
          raceBgmRef.current.play().catch(() => {});
        }
      } else {
        if (menuBgmRef.current) {
          menuBgmRef.current.volume = 0.15;
          menuBgmRef.current.play().catch(() => {});
        }
      }
    }
  }, [screen, room?.status, soundOn]);

  useEffect(() => {
    const handleFirstClick = () => {
      if (soundOn) {
        if (screen === 'room' && room?.status === 'racing')
          raceBgmRef.current?.play().catch(() => {});
        else menuBgmRef.current?.play().catch(() => {});
      }
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, [soundOn, screen, room?.status]);

  // ===== COUNTDOWN 3-2-1-GO SEBELUM BALAPAN =====
  useEffect(() => {
    if (room?.status !== 'racing') {
      countdownStartedRef.current = false;
      setRaceReady(false);
      setCountdown(null);
      return;
    }
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;
    setRaceReady(false);
    setShowHowTo(false);

    let n = 3;
    setCountdown(3);
    sound('tick', soundRef.current);
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCountdown(n);
        sound('tick', soundRef.current);
      } else if (n === 0) {
        setCountdown(0); // tampil "GO!"
        sound('go', soundRef.current);
      } else {
        clearInterval(id);
        setCountdown(null);
        setRaceReady(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [room?.status]);

  const refreshQuizzes = useCallback(async () => {
    if (!supabase || !uid) return;
    const fetchList = async () => {
      const { data, error: e } = await supabase
        .from('quizzes')
        .select('id,title')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
      if (e) throw e;
      return data || [];
    };
    let list = await fetchList();

    // User yang belum punya kuis otomatis dibuatkan 1 kuis simulasi (15 soal mudah)
    if (list.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      try {
        await seedSampleQuiz(uid);
        list = await fetchList();
      } catch (err) {
        setError(
          'Gagal membuat kuis simulasi otomatis: ' +
            msg(err) +
            ' (kemungkinan izin tabel di Supabase belum mengizinkan)'
        );
      } finally {
        seedingRef.current = false;
      }
    }

    setQuizzes(list);
    setSelectedQuiz((prev) => prev || list[0]?.id || '');
  }, [uid]);

  const createSampleQuiz = () =>
    run(async () => {
      const id = await seedSampleQuiz(uid);
      await refreshQuizzes();
      setSelectedQuiz(id);
      setFeedback('Kuis simulasi berhasil dibuat!');
      fx('correct');
    });

  const refreshRoom = useCallback(async (id) => {
    if (!supabase || !id) return;
    const [r, p] = await Promise.all([
      supabase
        .from('rooms')
        .select('id,code,host_id,status,quiz_id,quiz_time_limit')
        .eq('id', id)
        .single(),
      supabase
        .from('room_players')
        .select('*')
        .eq('room_id', id)
        .order('distance', { ascending: false }),
    ]);
    if (r.error) throw r.error;
    if (p.error) throw p.error;
    setRoom(r.data);
    setPlayers((prevPlayers) => {
      const serverPlayers = p.data || [];
      return serverPlayers.map((sp) => {
        const lp = prevPlayers.find((x) => x.id === sp.id);
        if (lp && lp.distance > sp.distance && !sp.finished_at) {
          return {
            ...sp,
            distance: lp.distance,
            energy: lp.energy,
            needs_quiz: lp.needs_quiz,
          };
        }
        return sp;
      });
    });
  }, []);

  const advancePlayer = async () => {
    if (
      !room?.id ||
      room.status !== 'racing' ||
      !raceReady ||
      !me ||
      Number(me.energy) <= 0 ||
      me.needs_quiz ||
      me.finished_at ||
      showResults
    )
      return;
    const step = moveRef.current.sprinting ? 15 : 6;
    const cost = moveRef.current.sprinting ? 35 : 20;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.user_id === uid) {
          const nextDist = Math.min(300, Number(p.distance) + step);
          const nextEnergy = Math.max(0, Number(p.energy) - cost);
          return {
            ...p,
            distance: nextDist,
            energy: nextEnergy,
            needs_quiz: nextEnergy <= 0 && nextDist < 300,
            finished_at:
              nextDist >= 300
                ? p.finished_at || new Date().toISOString()
                : p.finished_at,
          };
        }
        return p;
      })
    );
    if (moveRef.current.sendingStep) {
      moveRef.current.pendingStep = true;
      return;
    }
    moveRef.current.sendingStep = true;
    try {
      await rpc('move_cat', {
        p_room: room.id,
        p_sprint: moveRef.current.sprinting,
      });
    } catch (e) {
    } finally {
      moveRef.current.sendingStep = false;
      if (moveRef.current.pendingStep) {
        moveRef.current.pendingStep = false;
        advancePlayer();
      }
    }
  };

  const pressRunKey = () => {
    if (
      screen !== 'room' ||
      room?.status !== 'racing' ||
      !raceReady ||
      me?.needs_quiz ||
      me?.finished_at ||
      showResults ||
      Number(me?.energy) <= 0
    )
      return;
    advancePlayer();
  };

  // Bot baru mulai berlari setelah hitung mundur selesai
  useEffect(() => {
    if (
      room?.status !== 'racing' ||
      !raceReady ||
      localBots.length === 0 ||
      showResults
    )
      return;
    const interval = setInterval(() => {
      setLocalBots((prev) =>
        prev.map((b) => {
          if (b.finished_at) return b;
          if (b.needs_quiz) {
            if (Math.random() > 0.4)
              return {
                ...b,
                needs_quiz: false,
                energy: 100,
                correct_count: b.correct_count + 1,
              };
            return b;
          }
          const step = Math.random() * 10 + 4;
          const nextDist = Math.min(300, Number(b.distance) + step);
          const nextEnergy = Math.max(
            0,
            Number(b.energy) - (Math.random() * 20 + 15)
          );
          return {
            ...b,
            distance: nextDist,
            energy: nextEnergy,
            needs_quiz:
              nextEnergy <= 0 && nextDist < 300 && Math.random() > 0.5,
            finished_at:
              nextDist >= 300
                ? b.finished_at || new Date().toISOString()
                : b.finished_at,
          };
        })
      );
    }, 1200);
    return () => clearInterval(interval);
  }, [room?.status, localBots.length, showResults, raceReady]);

  useEffect(() => {
    if (room?.status === 'racing' && me?.finished_at) {
      setShowResults(true);
      if (!finishedRef.current) {
        finishedRef.current = true;
        setFinalMs(raceStartTime ? Date.now() - raceStartTime : elapsedMs);
        setShowCongrats(true); // selamat dulu, baru podium
        fx('finish');
      }
    }
  }, [me?.finished_at, room?.status, soundOn]);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUid(session.user.id);
        setUserEmail(session.user.email || '');
        setIsGuest(session.user.is_anonymous || false);
        if (session.user.user_metadata?.name)
          setName(session.user.user_metadata.name);
        refreshQuizzes();
        setScreen('home');
      } else {
        setUid(null);
        setScreen('auth');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUid(session.user.id);
        setUserEmail(session.user.email || '');
        setIsGuest(session.user.is_anonymous || false);
        if (session.user.user_metadata?.name)
          setName(session.user.user_metadata.name);
        refreshQuizzes();
        setScreen('home');
      } else {
        setUid(null);
        setUserEmail('');
        setIsGuest(false);
        setScreen('auth');
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshQuizzes]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput)
      return setError('Email dan Password wajib diisi.');
    const email = emailInput.trim().toLowerCase();
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    if (authMode === 'register' && passwordInput.length < 8)
      return setError('Password minimal 8 karakter.');
    return run(async () => {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordInput,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials'))
            throw Error('Email atau Password salah.');
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwordInput,
          options: { data: { name: email.split('@')[0] } },
        });
        if (error) throw error;
        if (data.session === null) {
          setFeedback('Pendaftaran berhasil! Silakan cek email verifikasi.');
          setAuthMode('login');
          setEmailInput('');
          setPasswordInput('');
        } else {
          setFeedback('Pendaftaran berhasil!');
        }
      }
      fx('correct');
    });
  };

  const handleGuest = () =>
    run(async () => {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      fx('click');
    });

  const handleLogout = () =>
    run(async () => {
      await supabase.auth.signOut();
      home();
      fx('click');
    });

  useEffect(() => {
    if (!room?.id || !supabase) return;
    const id = room.id;
    let active = true;
    const channel = supabase
      .channel(`catdash-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
        () => active && refreshRoom(id).catch(() => {})
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${id}`,
        },
        () => active && refreshRoom(id).catch(() => {})
      )
      .subscribe();
    const timer = setInterval(
      () => active && refreshRoom(id).catch(() => {}),
      1800
    );
    return () => {
      active = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [room?.id, refreshRoom]);

  useEffect(() => {
    if (!room || !me?.needs_quiz || room.status !== 'racing' || showResults) {
      setQuestion(null);
      quizKey.current = '';
      return;
    }
    const key = `${room.id}-${me.correct_count}-${me.wrong_count}`;
    if (quizKey.current === key) return;
    quizKey.current = key;
    rpc('current_game_question', { p_room: room.id })
      .then((q) => {
        if (q && q.prompt && Array.isArray(q.options)) setQuestion(q);
        else
          setQuestion({
            number: 1,
            type: 'pg',
            prompt: 'Soal tidak ditemukan. Berapakah 5 + 5?',
            options: ['8', '9', '10', '11'],
          });
      })
      .catch((e) => {
        setError(msg(e));
        setQuestion({
          number: 1,
          type: 'pg',
          prompt: 'Gagal memuat. Berapakah 2 x 3?',
          options: ['4', '5', '6', '7'],
        });
      });
  }, [
    room?.id,
    room?.status,
    me?.needs_quiz,
    me?.correct_count,
    me?.wrong_count,
    showResults,
  ]);

  // Stopwatch baru jalan setelah hitung mundur selesai
  useEffect(() => {
    if (room?.status !== 'racing' || !raceReady) {
      setRaceStartTime(null);
      setElapsedMs(0);
      return;
    }
    setRaceStartTime((old) => old ?? Date.now());
  }, [room?.status, raceReady]);

  useEffect(() => {
    if (!raceStartTime || room?.status !== 'racing' || showResults) return;
    const tick = () => setElapsedMs(Date.now() - raceStartTime);
    tick();
    const id = setInterval(tick, 37);
    return () => clearInterval(id);
  }, [raceStartTime, room?.status, showResults]);

  useEffect(() => {
    if (
      !(room?.status === 'racing' && me?.needs_quiz && question && !showResults)
    ) {
      setQuizSeconds(room?.quiz_time_limit || 15);
      quizTimeoutRef.current = false;
      return;
    }
    setQuizSeconds(room?.quiz_time_limit || 15);
    quizTimeoutRef.current = false;
    const id = setInterval(
      () => setQuizSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [
    room?.status,
    me?.needs_quiz,
    question?.number,
    showResults,
    room?.quiz_time_limit,
  ]);

  useEffect(() => {
    if (
      quizSeconds === 0 &&
      question &&
      !quizTimeoutRef.current &&
      !busyRef.current &&
      !showResults
    ) {
      quizTimeoutRef.current = true;
      answerRef.current?.('WAKTU_HABIS');
    }
  }, [quizSeconds, question, showResults]);

  useEffect(() => {
    const down = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName
        )
      )
        return;
      const k = e.key.toLowerCase();
      if (['d', 'arrowright', 'shift'].includes(k)) e.preventDefault();
      if (screen !== 'room' || room?.status !== 'racing' || showResults) return;
      if ((k === 'd' || k === 'arrowright') && !e.repeat) pressRunKey();
      if (k === 'shift' && !moveRef.current.sprinting) {
        moveRef.current.sprinting = true;
        setSprinting(true);
      }
    };
    const up = (e) => {
      if (e.key.toLowerCase() === 'shift') {
        moveRef.current.sprinting = false;
        setSprinting(false);
      }
    };
    const stop = () => {
      moveRef.current.sprinting = false;
      setSprinting(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stop);
    };
  }, [
    screen,
    room?.status,
    room?.id,
    me?.needs_quiz,
    me?.finished_at,
    showResults,
    me?.energy,
    raceReady,
  ]);

  const enterRoom = async (id) => {
    await refreshRoom(id);
    setStepHint('Tekan D atau klik LARI untuk berlari!');
    setScreen('room');
    setFeedback('');
    // Pemain baru otomatis dapat panduan cara main di lobby
    if (!localStorage.getItem('catdash_howto_seen')) setShowHowTo(true);
  };

  const closeHowTo = () => {
    setShowHowTo(false);
    localStorage.setItem('catdash_howto_seen', 'true');
    fx('click');
  };

  const saveQuiz = () =>
    run(async () => {
      if (!title.trim()) throw Error('Isi judul kuis.');
      if (!questions.length || questions.length > 50)
        throw Error('Jumlah soal 1-50.');
      questions.forEach((q, i) => {
        if (!q.prompt.trim())
          throw Error(`Soal nomor ${i + 1} belum ada pertanyaannya.`);
        if (q.type === 'isian' && !q.correct_text.trim())
          throw Error(
            `Kunci jawaban isian untuk soal nomor ${i + 1} belum diisi.`
          );
        else if (q.type !== 'isian' && q.options.some((o) => !o.trim()))
          throw Error(`Lengkapi semua pilihan ganda soal nomor ${i + 1}.`);
      });
      const { data, error: e } = await supabase
        .from('quizzes')
        .insert({ owner_id: uid, title: title.trim() })
        .select('id')
        .single();
      if (e) throw e;
      const { error: qe } = await supabase.from('quiz_questions').insert(
        questions.map((q, i) => {
          let finalOptions = q.options;
          if (q.type === 'isian') finalOptions = [q.correct_text];
          if (q.type === 'tf') finalOptions = ['Benar', 'Salah'];
          return {
            quiz_id: data.id,
            position: i,
            prompt: q.prompt.trim(),
            type: q.type,
            options: finalOptions.map((o) => o.trim()),
            correct_index: Number(q.correct_index),
          };
        })
      );
      if (qe) {
        await supabase.from('quizzes').delete().eq('id', data.id);
        throw qe;
      }
      await refreshQuizzes();
      setSelectedQuiz(data.id);
      setTitle('');
      setQuestions([blank()]);
      setScreen('host');
      setFeedback('Kuis tersimpan!');
      fx('correct');
    });

  const makeRoom = () =>
    run(async () => {
      if (!uid || !name.trim() || !selectedQuiz)
        throw Error('Lengkapi nama dan pilih kuis.');
      localStorage.setItem('catdash_name', name.trim());
      const code = await rpc('create_game_room', {
        p_quiz: selectedQuiz,
        p_name: name.trim(),
        p_cat: cat,
        p_time_limit: timeLimit,
      });
      const { data, error: e } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single();
      if (e) throw e;
      await enterRoom(data.id);
      fx('start');
    });

  const joinRoom = () =>
    run(async () => {
      if (!uid || !name.trim()) throw Error('Isi nama pemain.');
      if (!/^\d{6}$/.test(joinCode.trim())) throw Error('Kode room 6 digit.');
      localStorage.setItem('catdash_name', name.trim());
      const id = await rpc('join_game_room', {
        p_code: joinCode.trim(),
        p_name: name.trim(),
        p_cat: cat,
      });
      await enterRoom(id);
      fx('click');
    });

  const startGame = () =>
    run(async () => {
      await rpc('start_game_room', { p_room: room.id });
      if (botCount > 0) {
        const newBots = Array.from({ length: botCount }).map((_, i) => ({
          id: `bot-${i}`,
          user_id: `bot-${i}`,
          nickname: `Bot ${LABELS[CATS[i % 4]]}`,
          cat: CATS[i % 4],
          distance: 0,
          energy: 100,
          needs_quiz: false,
          correct_count: 0,
          wrong_count: 0,
          finished_at: null,
        }));
        setLocalBots(newBots);
      }
      await refreshRoom(room.id);
      fx('start');
    });

  const answer = (val) => {
    if (busyRef.current) return;
    setShortAnswerInput('');
    return run(async () => {
      try {
        const ok = await rpc('answer_game_question', {
          p_room: room.id,
          p_answer: String(val),
        });
        if (ok) {
          setFeedback('BENAR! Energi Penuh!');
          fx('correct');
          setQuestion(null);
          quizKey.current = '';
          setPlayers((prev) =>
            prev.map((p) =>
              p.user_id === uid
                ? {
                    ...p,
                    needs_quiz: false,
                    energy: 100,
                    correct_count: p.correct_count + 1,
                  }
                : p
            )
          );
        } else {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          setFeedback(
            val === 'WAKTU_HABIS'
              ? 'WAKTU HABIS! Jawaban salah.'
              : 'SALAH! Coba soal baru.'
          );
          fx('wrong');
          setQuestion(null);
          quizKey.current = '';
          setPlayers((prev) =>
            prev.map((p) =>
              p.user_id === uid
                ? {
                    ...p,
                    needs_quiz: true,
                    energy: 0,
                    wrong_count: p.wrong_count + 1,
                  }
                : p
            )
          );
        }
        await refreshRoom(room.id);
      } catch (e) {
        setFeedback('Terjadi kesalahan sistem.');
        setError(msg(e));
      }
    });
  };
  answerRef.current = answer;

  const handleSubmitShortAnswer = (e) => {
    e.preventDefault();
    if (!shortAnswerInput.trim()) return;
    answer(shortAnswerInput.trim());
  };

  const deleteQuestion = (i) => {
    const q = questions[i];
    if (!q) return;
    const hasContent =
      q.prompt.trim() || q.correct_text.trim() || q.options.some((o) => o.trim());
    if (hasContent && !window.confirm(`Hapus soal nomor ${i + 1}?`)) return;
    if (questions.length === 1) {
      setQuestions([blank()]); // soal terakhir dikosongkan, bukan dihapus
      setFeedback('Soal dikosongkan.');
    } else {
      setQuestions((v) => v.filter((_, j) => j !== i));
      setFeedback(`Soal nomor ${i + 1} dihapus.`);
    }
    fx('click');
  };

  const setQ = (i, field, value, option) =>
    setQuestions((old) =>
      old.map((q, j) => {
        if (i !== j) return q;
        return option === undefined
          ? { ...q, [field]: value }
          : {
              ...q,
              options: q.options.map((v, k) => (k === option ? value : v)),
            };
      })
    );

  const openReview = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', room.quiz_id)
        .order('position');
      if (error) throw error;
      setReviewData(data);
      setScreen('review');
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSound = () => {
    setSoundOn((old) => {
      localStorage.setItem('catdash_sound', old ? 'off' : 'on');
      return !old;
    });
  };

  const handleUpdateProfile = () =>
    run(async () => {
      if (!name.trim()) throw Error('Nama tidak boleh kosong.');
      const { error: e } = await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      if (e) throw e;
      localStorage.setItem('catdash_name', name.trim());
      setFeedback('Profil berhasil diupdate!');
      fx('correct');
    });

  const home = () => {
    moveRef.current = {
      sprinting: false,
      sendingStep: false,
      pendingStep: false,
    };
    setRoom(null);
    setPlayers([]);
    setLocalBots([]);
    setQuestion(null);
    setScreen('home');
    setFeedback('');
    setShowResults(false);
    finishedRef.current = false;
    setShortAnswerInput('');
    setReviewData(null);
    setShowHowTo(false);
    setCountdown(null);
    setRaceReady(false);
    countdownStartedRef.current = false;
    setShowCongrats(false);
    setFinalMs(0);
  };

  if (!configured)
    return (
      <main className="wrap">
        <section className="panel">
          <h1>CAT DASH</h1>
          <h2>Hubungkan Supabase dulu</h2>
        </section>
      </main>
    );

  // Isi panduan cara main (dipakai di modal & kartu lobby)
  const howToItems = (
    <ol className="instruction-list">
      <li>
        Tekan <span className="kbd">D</span> (atau <span className="kbd">→</span>
        , atau tombol <b>LARI</b>) berulang-ulang untuk menggerakkan kucingmu.
      </li>
      <li>
        Tahan <span className="kbd">SHIFT</span> (atau tombol <b>⚡ SPRINT</b>)
        sambil menekan D untuk melangkah lebih jauh, tapi energi lebih boros.
      </li>
      <li>
        Setiap langkah memakai energi ⚡. Kalau energi habis, kamu harus{' '}
        <b>menjawab soal kuis</b>.
      </li>
      <li>
        Jawaban <b>benar</b> = energi penuh lagi. Jawaban <b>salah</b> atau
        waktu habis = dapat soal baru.
      </li>
      <li>
        Kucingmu ditandai <b>panah kuning ▼ KAMU</b> di atas kepalanya.
        Siapa yang pertama sampai garis finish 🏁 (300 m) menang!
      </li>
    </ol>
  );

  return (
    <main className={`wrap ${isShaking ? 'shake' : ''}`}>
      <audio
        ref={menuBgmRef}
        src="/audio/bgm_menu.mp3"
        loop
        onError={(e) => {
          if (e.target.src.indexOf('pixabay') === -1) {
            e.target.src =
              'https://cdn.pixabay.com/audio/2022/03/15/audio_27dbd9d363.mp3';
            if (soundOn) e.target.play().catch(() => {});
          }
        }}
      />
      <audio
        ref={raceBgmRef}
        src="/audio/bgm_race.mp3"
        loop
        onError={(e) => {
          if (e.target.src.indexOf('pixabay') === -1) {
            e.target.src =
              'https://cdn.pixabay.com/audio/2021/09/30/audio_3b01e7a2b6.mp3';
            if (soundOn) e.target.play().catch(() => {});
          }
        }}
      />

      {/* ===== TUTORIAL SPOTLIGHT INTERAKTIF ===== */}
      {showTutorial && targetRect && (
        <>
          <div
            className="tutorial-highlight"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
          <div
            className="tutorial-tooltip"
            style={{
              top: targetRect.top + targetRect.height + 20,
              left: Math.max(
                20,
                Math.min(
                  window.innerWidth - 360,
                  targetRect.left + targetRect.width / 2 - 170
                )
              ),
            }}
          >
            <div className="tutorial-tooltip-arrow" />
            <h3>{TOUR_FLOWS[tutorialFlow][tutorialStep].title}</h3>
            <p>{TOUR_FLOWS[tutorialFlow][tutorialStep].desc}</p>
            <div className="tutorial-footer">
              <div className="tutorial-dots">
                {TOUR_FLOWS[tutorialFlow].map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === tutorialStep ? 'active' : ''}`}
                  />
                ))}
              </div>
              <div className="tutorial-buttons">
                <button className="ghost" onClick={closeTutorial}>
                  Tutup
                </button>
                {tutorialStep > 0 && (
                  <button className="ghost" onClick={prevTutorialStep}>
                    ← Sebelumnya
                  </button>
                )}
                {tutorialStep === TOUR_FLOWS[tutorialFlow].length - 1 &&
                NEXT_TOUR_FLOW[tutorialFlow] ? (
                  <button className="secondary" onClick={goToNextTutorialPage}>
                    Lanjut ke {NEXT_TOUR_FLOW[tutorialFlow].label} →
                  </button>
                ) : (
                  <button className="secondary" onClick={nextTutorialStep}>
                    {tutorialStep === TOUR_FLOWS[tutorialFlow].length - 1
                      ? 'Selesai'
                      : 'Lanjut →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <header>
        <div>
          <span className="brand">🐾 CAT DASH</span>
          <small>MULTIPLAYER QUIZ RACE</small>
        </div>
        <div className="headerRight">
          {uid ? (
            <>
              <button
                id="tour-btn-suara"
                className="ghost soundButton"
                onClick={toggleSound}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
              <button
                className="ghost"
                onClick={startTutorial}
                style={{
                  fontWeight: 'bold',
                  color: 'var(--pink-shadow)',
                  borderColor: 'var(--pink-soft)',
                }}
              >
                ❓ PANDUAN
              </button>
              {screen !== 'home' &&
                screen !== 'review' &&
                screen !== 'profile' && (
                  <button
                    className="ghost"
                    onClick={home}
                    style={{ fontWeight: 'bold' }}
                  >
                    MENU
                  </button>
                )}
              <button
                className="ghost"
                id="tour-btn-profil"
                onClick={() => {
                  setScreen('profile');
                  fx('click');
                }}
              >
                👤 PROFIL
              </button>
            </>
          ) : (
            <span className="status">○ BELUM LOGIN</span>
          )}
        </div>
      </header>

      {error && (
        <div className="alert">
          ⚠ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {feedback && (
        <div className="notice" onClick={() => setFeedback('')}>
          {feedback} ×
        </div>
      )}

      {/* AUTH */}
      {screen === 'auth' && (
        <section
          className="panel center hero"
          style={{ maxWidth: '500px', margin: '0 auto' }}
        >
          <h1>CAT DASH</h1>
          <p className="hero-desc">
            Masuk untuk menyimpan progres dan bertanding dengan teman-temanmu.
          </p>
          <div
            className="questionEditor"
            style={{ marginTop: '20px', textAlign: 'left' }}
          >
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
              {authMode === 'login' ? 'Masuk Akun' : 'Daftar Akun Baru'}
            </h2>
            <form onSubmit={handleAuth}>
              <label>
                Email
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="namamu@gmail.com"
                  autoComplete="email"
                  required
                />
                <small style={{ display: 'block', marginTop: '6px' }}>
                  Gunakan email aktif (Gmail, Yahoo, Outlook, iCloud, atau
                  email sekolah/kampus).
                </small>
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                style={{ width: '100%', marginTop: '15px' }}
              >
                {busy
                  ? 'MEMPROSES...'
                  : authMode === 'login'
                  ? 'MASUK'
                  : 'DAFTAR SEKARANG'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                className="linkBtn"
                onClick={() =>
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                }
              >
                {authMode === 'login'
                  ? 'Belum punya akun? Daftar di sini'
                  : 'Sudah punya akun? Masuk di sini'}
              </button>
            </div>
          </div>
          {ALLOW_GUEST && (
            <div
              className="actions"
              style={{ justifyContent: 'center', marginTop: '20px' }}
            >
              <button
                className="secondary"
                onClick={handleGuest}
                disabled={busy}
              >
                🎮 MAIN SEBAGAI TAMU
              </button>
            </div>
          )}
        </section>
      )}

      {/* PROFILE */}
      {screen === 'profile' && (
        <section
          className="panel"
          style={{ maxWidth: '500px', margin: '0 auto' }}
        >
          <h2>👤 Profil Pengguna</h2>
          <p className="muted">Kelola identitasmu di game.</p>

          <div className="questionEditor" style={{ marginTop: '20px' }}>
            <div className="between" style={{ marginBottom: '15px' }}>
              <b>Email / Status:</b>
              <span>{isGuest ? 'Tamu (Guest)' : userEmail}</span>
            </div>

            <label>Nama Pemain</label>
            <input
              id="tour-input-nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />

            <button
              id="tour-btn-simpan-profil"
              className="secondary"
              onClick={handleUpdateProfile}
              disabled={busy}
              style={{ width: '100%', marginTop: '15px' }}
            >
              {busy ? 'MENYIMPAN...' : '💾 SIMPAN NAMA'}
            </button>

            <label className="checkRow">
              <input
                type="checkbox"
                checked={!hideWelcome}
                onChange={(e) => toggleHideWelcome(!e.target.checked)}
              />
              <span>Tampilkan pesan selamat datang saat membuka aplikasi</span>
            </label>
          </div>

          <div className="actions" style={{ marginTop: '30px' }}>
            <button
              id="tour-btn-logout"
              className="ghost danger"
              onClick={handleLogout}
              style={{ width: '100%' }}
            >
              🚪 KELUAR / LOG OUT
            </button>
            <button
              className="ghost"
              onClick={() => setScreen('home')}
              style={{ width: '100%' }}
            >
              KEMBALI KE MENU
            </button>
          </div>
        </section>
      )}

      {/* HOME */}
      {screen === 'home' && (
        <section className="panel center hero">
          <h1>CAT DASH</h1>
          <p className="hero-desc">
            — 🐾 Siap membuktikan siapa raja jalur lari kucing yang cerdas dan gesit? — 
            Cat Dash adalah game balap kucing multiplayer yang
            menggabungkan kecepatan jari dan ketajaman otak! ✨
          </p>
          <div className="heroCats">
            {CATS.map((c) => (
              <Cat key={c} cat={c} size={90} />
            ))}
          </div>
          <div className="actions">
            <button
              id="tour-btn-kuis"
              onClick={() => {
                setScreen('create');
                fx('click');
              }}
            >
              ✎ BUAT KUIS
            </button>
            <button
              id="tour-btn-bersama"
              onClick={() => {
                refreshQuizzes().catch((e) => setError(msg(e)));
                setScreen('host');
                fx('click');
              }}
            >
              📚 MAIN BERSAMA
            </button>
            <button
              id="tour-btn-gabung"
              onClick={() => {
                setScreen('join');
                fx('click');
              }}
            >
              ⌨ GABUNG ROOM
            </button>
          </div>
        </section>
      )}

      {/* CREATE */}
      {screen === 'create' && (
        <section className="panel">
          <h2>✎ Buat Kuis Sendiri</h2>
          <label>Judul kuis</label>
          <input
            id="tour-input-judul"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misalnya: IPA Kelas 7"
          />

          {questions.map((q, i) => (
            <div className="questionEditor" key={q._key}>
              <div className="between">
                <b>SOAL {i + 1}</b>
                <div>
                  <select
                    id={i === 0 ? 'tour-pilih-tipe' : undefined}
                    value={q.type}
                    onChange={(e) => setQ(i, 'type', e.target.value)}
                    style={{
                      padding: '5px',
                      marginRight: '10px',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="pg">Pilihan Ganda (4 Opsi)</option>
                    <option value="tf">Benar / Salah</option>
                    <option value="isian">Isian Singkat</option>
                  </select>
                  <button
                    type="button"
                    id={i === 0 ? 'tour-btn-hapus-soal' : undefined}
                    className="ghost danger"
                    onClick={() => deleteQuestion(i)}
                  >
                    🗑 HAPUS
                  </button>
                </div>
              </div>
              <textarea
                id={i === 0 ? 'tour-input-soal' : undefined}
                rows={2}
                value={q.prompt}
                onChange={(e) => setQ(i, 'prompt', e.target.value)}
                placeholder="Tulis pertanyaan..."
              />
              {q.type === 'pg' && (
                <div className="options">
                  {q.options.map((v, j) => (
                    <label className="optionEdit" key={j}>
                      <span>{'ABCD'[j]}</span>
                      <input
                        value={v}
                        onChange={(e) => setQ(i, 'options', e.target.value, j)}
                        placeholder={`Pilihan ${'ABCD'[j]}`}
                      />
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={Number(q.correct_index) === j}
                        onChange={() => setQ(i, 'correct_index', j)}
                      />
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'tf' && (
                <div className="options">
                  <label className="optionEdit">
                    <span>Benar</span>
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={Number(q.correct_index) === 0}
                      onChange={() => setQ(i, 'correct_index', 0)}
                    />
                  </label>
                  <label className="optionEdit">
                    <span>Salah</span>
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={Number(q.correct_index) === 1}
                      onChange={() => setQ(i, 'correct_index', 1)}
                    />
                  </label>
                </div>
              )}
              {q.type === 'isian' && (
                <div style={{ marginTop: '10px' }}>
                  <label>Kunci Jawaban</label>
                  <input
                    value={q.correct_text}
                    onChange={(e) => setQ(i, 'correct_text', e.target.value)}
                    placeholder="Contoh: 12"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="actions">
            <button
              id="tour-btn-tambah-soal"
              className="secondary"
              disabled={questions.length >= 50}
              onClick={() => setQuestions((v) => [...v, blank()])}
            >
              + TAMBAH SOAL
            </button>
            <button
              id="tour-btn-simpan"
              disabled={busy || !uid}
              onClick={saveQuiz}
            >
              {busy ? 'MENYIMPAN...' : '💾 SIMPAN KUIS'}
            </button>
          </div>
        </section>
      )}

      {/* HOST / JOIN */}
      {(screen === 'host' || screen === 'join') && (
        <section className="panel">
          <h2>{screen === 'host' ? '📚 Kuis Saya' : '⌨ Gabung Room'}</h2>

          <div
            className="questionEditor"
            style={{
              background: 'var(--bg-almond)',
              borderColor: 'var(--pink-soft)',
              marginBottom: '20px',
            }}
          >
            <label>
              Nama pemain
              <input
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
              />
            </label>
            <h3 style={{ marginTop: '15px' }}>Pilih kucing</h3>
            <div className="catPicker" id="tour-pilih-kucing">
              {CATS.map((c) => (
                <button
                  key={c}
                  className={`catOption ${cat === c ? 'chosen' : ''}`}
                  onClick={() => setCat(c)}
                >
                  <Cat cat={c} size={76} />
                  <small>{LABELS[c]}</small>
                </button>
              ))}
            </div>
          </div>

          {screen === 'host' ? (
            <>
              <label>Pilih kuis</label>
              <select
                id="tour-pilih-kuis"
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
              >
                <option value="">-- Pilih kuis --</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
              {quizzes.length === 0 && (
                                <div>
                  <p>
                    Belum punya kuis.{' '}
                    <button
                      className="linkBtn"
                      onClick={() => setScreen('create')}
                    >
                      Buat kuis dulu
                    </button>
                    .
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={createSampleQuiz}
                  >
                    🎮 BUAT KUIS SIMULASI (15 SOAL)
                  </button>
                </div>
              )}

              <label>Jumlah Bot (Lawan Sendiri)</label>
              <input
                id="tour-input-bot"
                type="number"
                min="0"
                max="5"
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
              />

              <label>Waktu per Soal (detik)</label>
              <input
                id="tour-input-timer"
                type="number"
                min="5"
                max="60"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />

              <button
                id="tour-btn-buat-room"
                disabled={busy || !uid}
                onClick={makeRoom}
              >
                {busy ? 'MEMBUAT...' : '🎮 BUAT KODE ROOM'}
              </button>
            </>
          ) : (
            <>
              <label>Kode room 6 digit</label>
              <input
                id="tour-input-kode"
                inputMode="numeric"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
              <button
                id="tour-btn-gabung-sekarang"
                disabled={busy || !uid}
                onClick={joinRoom}
              >
                GABUNG SEKARANG
              </button>
            </>
          )}
        </section>
      )}

      {/* ROOM */}
      {screen === 'room' && room && (
        <section className="panel">
          <div className="between roomHeading">
            <div>
              <h2>
                {room.status === 'lobby'
                  ? 'LOBBY BALAPAN'
                  : showResults
                  ? 'BALAPAN SELESAI'
                  : 'BALAPAN DIMULAI!'}
              </h2>
              <p className="muted">
                {room.status === 'lobby'
                  ? 'Bagikan kode ini ke teman-teman.'
                  : `Kode room: ${room.code}`}
              </p>
            </div>
            <button
              className="code"
              onClick={() => navigator.clipboard?.writeText(room.code)}
            >
              {room.code} ⧉
            </button>
          </div>
          {room.status === 'lobby' ? (
            <>
              <p>
                Pemain siap: <b>{players.length}/10</b>
              </p>
              <div className="playerGrid">
                {players.map((p) => (
                  <div className="playerCard" key={p.id}>
                    <div className="lobbyCatFrame">
                      <Cat cat={p.cat} size={96} />
                    </div>
                    <b>{p.nickname}</b>
                    {p.user_id === room.host_id && <small>HOST</small>}
                    {p.user_id === uid && <small>KAMU</small>}
                  </div>
                ))}
              </div>

              <div className="howto-card">
                <div className="between">
                  <h3 style={{ margin: 0 }}>📖 Cara Bermain</h3>
                  <button
                    className="ghost"
                    onClick={() => {
                      setShowHowTo(true);
                      fx('click');
                    }}
                  >
                    LIHAT PANDUAN
                  </button>
                </div>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  Tekan <span className="kbd">D</span> untuk lari, tahan{' '}
                  <span className="kbd">SHIFT</span> untuk sprint, dan jawab
                  kuis saat energi habis. Balapan dimulai dengan hitung mundur
                  3-2-1.
                </p>
              </div>

              {isHost ? (
                <button
                  disabled={busy || players.length < 1}
                  onClick={startGame}
                >
                  ▶ MULAI BALAPAN
                </button>
              ) : (
                <p className="muted">Menunggu host memulai...</p>
              )}
            </>
          ) : showResults && showCongrats ? (
            <div className="congrats-modal">
              <div className="congrats-confetti">🎉 🎊 ✨ 🎊 🎉</div>
              <h2 className="congrats-title">SELAMAT!</h2>
              <div className="congrats-cat">
                <Cat cat={me?.cat || cat} action="idle" size={110} />
              </div>
              <p className="congrats-desc">{congratsText}</p>
              <div className="congrats-stats">
                <div className="between">
                  <span>🏁 Peringkat</span>
                  <b>
                    {myPosition} dari {rankedPlayers.length}
                  </b>
                </div>
                <div className="between">
                  <span>⏱ Waktu</span>
                  <b>{formatTime(finalMs)}</b>
                </div>
                <div className="between">
                  <span>✅ Jawaban benar</span>
                  <b>{me?.correct_count || 0}</b>
                </div>
              </div>
              <button
                style={{ marginTop: '20px', width: '100%' }}
                onClick={() => {
                  setShowCongrats(false);
                  fx('click');
                }}
              >
                🏆 LIHAT PODIUM
              </button>
            </div>
          ) : showResults ? (
            <div className="results-container">
              <h2 className="podium-title">🏆 HASIL BALAPAN 🏆</h2>
              <div className="podium-wrapper">
                {rankedPlayers[1] && (
                  <div className="podium-step step-2">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[1].cat} size={64} />
                    </div>
                    <div className="podium-info">
                      <span className="medal">🥈</span>
                      <b>{rankedPlayers[1].nickname}</b>
                      <small>{Math.floor(rankedPlayers[1].distance)}m</small>
                    </div>
                  </div>
                )}
                {rankedPlayers[0] && (
                  <div className="podium-step step-1">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[0].cat} size={80} />
                    </div>
                    <div className="podium-info">
                      <span className="medal">🥇</span>
                      <b>{rankedPlayers[0].nickname}</b>
                      <small>{Math.floor(rankedPlayers[0].distance)}m</small>
                    </div>
                  </div>
                )}
                {rankedPlayers[2] && (
                  <div className="podium-step step-3">
                    <div className="podium-cat">
                      <Cat cat={rankedPlayers[2].cat} size={56} />
                    </div>
                    <div className="podium-info">
                      <span className="medal">🥉</span>
                      <b>{rankedPlayers[2].nickname}</b>
                      <small>{Math.floor(rankedPlayers[2].distance)}m</small>
                    </div>
                  </div>
                )}
              </div>
              <div className="results-list">
                <h3>Peringkat Lainnya</h3>
                {rankedPlayers.slice(3).map((p, i) => (
                  <div className="result-row" key={p.id}>
                    <span>{i + 4}.</span>
                    <span>{p.nickname}</span>
                    <span>{Math.floor(p.distance)}m</span>
                  </div>
                ))}
                {rankedPlayers.length <= 3 && (
                  <p
                    style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Tidak ada pemain lain.
                  </p>
                )}
              </div>
              <div className="podium-actions">
                <button
                  className="secondary"
                  onClick={openReview}
                  disabled={busy}
                >
                  {busy ? 'MEMUAT...' : '📖 LIHAT PEMBAHASAN'}
                </button>
                <button
                  onClick={() => {
                    home();
                    fx('click');
                  }}
                >
                  KEMBALI KE MENU
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="raceStage">
                {/* HITUNG MUNDUR 3-2-1-GO */}
                {countdown !== null && (
                  <div className="countdown-overlay">
                    <div
                      key={countdown}
                      className={`countdown-text ${
                        countdown === 0 ? 'go' : ''
                      }`}
                    >
                      {countdown === 0 ? 'GO!' : countdown}
                    </div>
                  </div>
                )}

                <div className="raceTopHud">
                  <div className="hudPill">
                    <span className="hudIcon">🏆</span>
                    <b>{me?.correct_count || 0}</b>
                    <small>BENAR</small>
                  </div>
                  <div className="hudPill">
                    <span className="hudIcon">🏁</span>
                    <b>300 m</b>
                  </div>
                  <div className="hudPill timerPill">
                    <span className="hudIcon">◷</span>
                    <b>{formatTime(elapsedMs)}</b>
                  </div>
                  <div className="energyPill">
                    <span>⚡</span>
                    <div className={`energyBar ${energyClass}`}>
                      <i style={{ width: `${myEnergy}%` }} />
                    </div>
                  </div>
                  <div className="hudPill positionPill">
                    <small>POSISI</small>
                    <b>
                      {myPosition}/{rankedPlayers.length}
                    </b>
                  </div>
                </div>

                <div
                  className="raceScenery"
                  style={{ minHeight: `${sceneryMinHeight}px` }}
                >
                  <div className="mountainRange" />
                  <div className="sakuraTree treeOne">🌸</div>
                  <div className="sakuraTree treeTwo">🌸</div>
                  <div className="pagoda">🏯</div>
                  <div className="fenceLine" />
                  <div className="raceLanes">
                    {lanePlayers.map((p) => {
                      const mine = p.user_id === uid;
                      const progress = Math.min(
                        88,
                        Math.max(3, (Number(p.distance) / 300) * 88)
                      );
                      const moving = Number(p.distance) > 0;
                      const action = p.finished_at
                        ? 'idle'
                        : mine && sprinting && moving
                        ? 'dash'
                        : moving
                        ? 'run_1'
                        : 'idle';
                      return (
                        <div
                          className={`raceLane runnerLane ${
                            mine ? 'myRunnerLane' : ''
                          }`}
                          key={p.id}
                        >
                          <div className="laneDecor" />
                          <span className="runnerTrackName">
                            {mine ? 'LINTASAN KAMU' : p.nickname}
                          </span>
                          <div
                            className={`raceCat ${
                              mine ? 'myRaceCat' : 'rivalCat'
                            }`}
                            style={{ left: `${progress}%` }}
                          >
                            {mine ? (
                              <div className="youPointer">
                                <span className="youTag">KAMU</span>
                                <span className="youArrow">▼</span>
                              </div>
                            ) : (
                              <div className="rivalName">{p.nickname}</div>
                            )}
                            <Cat
                              cat={p.cat}
                              action={action}
                              size={mine ? 56 : 46}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="finishBanner">🏁</div>
                </div>

                <div className="raceBottomHud">
                  <div className="controlKeys">
                    <button
                      className={`arcadeKey runKey ${
                        myEnergy <= 0 || !raceReady ? 'disabledKey' : ''
                      }`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        pressRunKey();
                      }}
                      style={{ minWidth: '120px' }}
                    >
                      <b>D</b>
                      <small>LARI</small>
                    </button>
                    <button
                      className={`arcadeKey ${sprinting ? 'keyActive' : ''}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        moveRef.current.sprinting = true;
                        setSprinting(true);
                      }}
                      onPointerUp={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onPointerLeave={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onPointerCancel={() => {
                        moveRef.current.sprinting = false;
                        setSprinting(false);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <b>⚡</b>
                      <small>
                        SHIFT
                        <br />
                        SPRINT
                      </small>
                    </button>
                  </div>
                  <div className="distanceCard">
                    <small>JARAK SAAT INI</small>
                    <b>{Math.floor(Number(me?.distance || 0))} m</b>
                  </div>
                  <div className="miniProgress">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Number(me?.distance || 0) / 3
                        )}%`,
                      }}
                    />
                    <span>🐱</span>
                    <b>🏁</b>
                  </div>
                  <div className="woodTip">
                    Tekan D atau tahan
                    <br />
                    Jawab kuis jika energi habis!
                  </div>
                </div>
              </div>
              <div className="raceMeta">
                {rankedPlayers.length} PEMAIN/BOT • TEKAN D: MAJU • SHIFT:
                SPRINT<span className="stepHint">{stepHint}</span>
              </div>
            </>
          )}
        </section>
      )}

      {screen === 'review' && reviewData && (
        <section className="panel">
          <div className="between roomHeading">
            <div>
              <h2>📖 PEMBAHASAN KUIS</h2>
              <p className="muted">
                Kunci jawaban dan statistik akurasi pemain.
              </p>
            </div>
            <button className="ghost" onClick={home}>
              KEMBALI KE MENU
            </button>
          </div>
          <div className="review-layout">
            <div className="review-players">
              <h3>📊 Akurasi Pemain</h3>
              <div className="player-stats-list">
                {rankedPlayers.map((p) => {
                  const totalQ = p.correct_count + p.wrong_count;
                  const acc =
                    totalQ > 0
                      ? Math.round((p.correct_count / totalQ) * 100)
                      : 0;
                  return (
                    <div className="player-stat-card" key={p.id}>
                      <div className="player-stat-header">
                        <b>{p.nickname}</b>
                        <span
                          className={`acc-badge ${
                            acc >= 70 ? 'high' : acc >= 40 ? 'mid' : 'low'
                          }`}
                        >
                          {acc}% Akurasi
                        </span>
                      </div>
                      <div className="player-stat-details">
                        <span>✅ {p.correct_count} Benar</span>
                        <span>❌ {p.wrong_count} Salah</span>
                        <span>📝 {totalQ} Soal Dijawab</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="review-answers">
              <h3>🔑 Kunci Jawaban</h3>
              <div className="answers-list">
                {reviewData.map((q, i) => {
                  let correctAns = '';
                  if (q.type === 'isian') correctAns = q.options[0];
                  else if (q.type === 'tf')
                    correctAns = q.options[q.correct_index];
                  else
                    correctAns = `Opsi ${'ABCD'[q.correct_index]}. ${
                      q.options[q.correct_index]
                    }`;
                  return (
                    <div className="answer-card" key={q.id}>
                      <p className="q-prompt">
                        <b>Soal {i + 1}:</b> {q.prompt}
                      </p>
                      <p className="q-correct">
                        <b>Jawaban Benar:</b> <span>{correctAns}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PESAN SELAMAT DATANG */}
      {showWelcome && uid && screen === 'home' && !showTutorial && (
        <div className="overlay">
          <div className="instruction-modal welcome-modal">
            <div className="welcomeCats">
              {CATS.map((c) => (
                <Cat key={c} cat={c} size={60} />
              ))}
            </div>
            <h2>Selamat datang{name ? `, ${name}` : ''}! 🐾</h2>
            <p className="welcome-desc">
              {localStorage.getItem(`catdash_tutorial_seen_${uid}`)
                ? 'Senang melihatmu lagi! Mau lihat panduan cara bermain Cat Dash lagi?'
                : 'Sepertinya kamu baru di Cat Dash. Mau diajak keliling dulu supaya tidak bingung? Hanya sebentar kok!'}
            </p>
            <div className="actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => closeWelcome(true)}>
                📖 YA, MULAI TUTORIAL
              </button>
              <button className="ghost" onClick={() => closeWelcome(false)}>
                NANTI SAJA
              </button>
            </div>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={hideWelcome}
                onChange={(e) => toggleHideWelcome(e.target.checked)}
              />
              <span>
                Jangan tampilkan lagi saat membuka aplikasi
                <small style={{ display: 'block' }}>
                  Bisa diaktifkan kembali di menu Profil.
                </small>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN CARA MAIN */}
      {screen === 'room' && room?.status === 'lobby' && showHowTo && (
        <div className="overlay">
          <div className="instruction-modal">
            <h2>🐾 Cara Bermain Cat Dash</h2>
            {howToItems}
            <button style={{ width: '100%' }} onClick={closeHowTo}>
              MENGERTI, AYO MAIN! 🎮
            </button>
          </div>
        </div>
      )}

      {screen === 'room' &&
        room?.status === 'racing' &&
        me?.needs_quiz &&
        !showResults && (
          <div className="overlay">
            <div className="quizModal">
              <h2>⚡ ENERGI HABIS!</h2>
              <p>
                Jawab soal dengan benar untuk memulihkan energi dan lanjut
                berlari.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '15px 0',
                }}
              >
                <span style={{ fontSize: '20px' }}>⏱</span>
                <div className="quizTimerBarWrapper">
                  <div
                    className="quizTimerBar"
                    style={{
                      width: `${
                        (quizSeconds / (room.quiz_time_limit || 15)) * 100
                      }%`,
                      backgroundColor:
                        quizSeconds > (room.quiz_time_limit || 15) * 0.3
                          ? 'var(--green-moss)'
                          : 'var(--pink-soft)',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: 900,
                    color: 'var(--text-dark)',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {quizSeconds}s
                </span>
              </div>
              {question ? (
                <>
                  <h3 style={{ marginBottom: '15px' }}>
                    SOAL {question.number}: {question.prompt}
                  </h3>
                  {question.type === 'pg' && (
                    <div className="answerGrid">
                      {question.options.map((o, i) => (
                        <button
                          key={i}
                          disabled={busy}
                          onClick={() => answer(i)}
                        >
                          {'ABCD'[i]}. {o}
                        </button>
                      ))}
                    </div>
                  )}
                  {question.type === 'tf' && (
                    <div
                      className="answerGrid"
                      style={{ gridTemplateColumns: '1fr 1fr' }}
                    >
                      <button
                        disabled={busy}
                        onClick={() => answer(0)}
                        style={{ textAlign: 'center', fontSize: '18px' }}
                      >
                        ✅ BENAR
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => answer(1)}
                        style={{ textAlign: 'center', fontSize: '18px' }}
                      >
                        ❌ SALAH
                      </button>
                    </div>
                  )}
                  {question.type === 'isian' && (
                    <form
                      onSubmit={handleSubmitShortAnswer}
                      style={{ marginTop: '20px' }}
                    >
                      <input
                        type="text"
                        value={shortAnswerInput}
                        onChange={(e) => setShortAnswerInput(e.target.value)}
                        placeholder="Ketik jawabanmu di sini..."
                        autoFocus
                        required
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        style={{ width: '100%', marginTop: '15px' }}
                      >
                        KIRIM JAWABAN
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <p>Memuat soal...</p>
              )}
            </div>
          </div>
        )}

      <footer>CAT DASH • Multiplayer Quiz Race</footer>
    </main>
  );
}
