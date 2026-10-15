// Get-Attendend Backend (Node + MySQL) - Render ready
// Run: npm install | node server.js | Deploy: Render Web Service (npm start)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const SECRET = process.env.API_SECRET || '';
function checkAuth(req, res, next) {
  if (!SECRET) return next();
  if (req.headers['x-api-secret'] === SECRET) return next();
  return res.status(401).json({ ok: false, error: 'wrong-secret' });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'attend',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- ADMIN: single row ----------
app.get('/api/admin', checkAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM admins LIMIT 1');
  res.json({ ok: true, admin: rows[0] || null });
});
app.put('/api/admin', checkAuth, async (req, res) => {
  const a = req.body || {};
  if (!a.id || !a.pass) return res.json({ ok: false, error: 'id-pass-required' });
  await pool.query(
    'INSERT INTO admins (id,pass,mob,movie,birth,school) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE pass=VALUES(pass),mob=VALUES(mob),movie=VALUES(movie),birth=VALUES(birth),school=VALUES(school)',
    [a.id, a.pass, a.mob || '', a.movie || '', a.birth || '', a.school || '']
  );
  // purana default row ho to single-admin rakho: sirf latest id rakho
  await pool.query('DELETE FROM admins WHERE id<>?', [a.id]);
  res.json({ ok: true });
});
app.post('/api/admin/login', checkAuth, async (req, res) => {
  const { id, pass } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM admins LIMIT 1');
  const ad = rows[0];
  if (!ad) return res.json({ ok: false, error: 'no-admin' });
  if (String(id || '').toLowerCase() === String(ad.id).toLowerCase() && String(pass || '') === ad.pass)
    return res.json({ ok: true, admin: ad });
  res.json({ ok: false, error: 'wrong' });
});
app.post('/api/admin/forgot', checkAuth, async (req, res) => {
  const { id, mob, movie, birth, school, newPass } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM admins LIMIT 1');
  const ad = rows[0];
  if (!ad) return res.json({ ok: false, error: 'no-admin' });
  if (String(id || '').toLowerCase() !== String(ad.id).toLowerCase()) return res.json({ ok: false, error: 'id' });
  if (String(mob || '') !== String(ad.mob || '')) return res.json({ ok: false, error: 'mob' });
  if (String(movie || '').toLowerCase() !== String(ad.movie || '').toLowerCase()) return res.json({ ok: false, error: 'movie' });
  if (String(birth || '').toLowerCase() !== String(ad.birth || '').toLowerCase()) return res.json({ ok: false, error: 'birth' });
  if (String(school || '').toLowerCase() !== String(ad.school || '').toLowerCase()) return res.json({ ok: false, error: 'school' });
  await pool.query('UPDATE admins SET pass=? WHERE id=?', [newPass, ad.id]);
  res.json({ ok: true });
});

// ---------- FULL SYNC (har device same data) ----------
app.get('/api/pull', checkAuth, async (req, res) => {
  const [e] = await pool.query('SELECT * FROM employees');
  const [r] = await pool.query('SELECT * FROM records ORDER BY `date` DESC');
  const [a] = await pool.query('SELECT * FROM admins LIMIT 1');
  const emp = e.map(x => ({ ...x, mustChangePass: !!x.mustChangePass }));
  const rec = r.map(x => ({ ...x, date: x.date.toISOString().slice(0, 10) }));
  res.json({ ok: true, emp, rec, admin: a[0] || null });
});
app.post('/api/push', checkAuth, async (req, res) => {
  const { emp = [], rec = [], admin = null } = req.body || {};
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const x of emp) {
      await conn.query(
        'INSERT INTO employees (id,name,pass,desg,mob,photo,store,storeArea,storeLat,storeLon,storeLink,created,mustChangePass) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),pass=VALUES(pass),desg=VALUES(desg),mob=VALUES(mob),photo=VALUES(photo),store=VALUES(store),storeArea=VALUES(storeArea),storeLat=VALUES(storeLat),storeLon=VALUES(storeLon),storeLink=VALUES(storeLink),mustChangePass=VALUES(mustChangePass)',
        [x.id, x.name, x.pass, x.desg || '', x.mob || '', x.photo || '', x.store || '', x.storeArea || '', x.storeLat ?? null, x.storeLon ?? null, x.storeLink || '', x.created || null, x.mustChangePass ? 1 : 0]
      );
    }
    for (const x of rec) {
      await conn.query(
        'INSERT INTO records (empId,`date`,name,store,storeArea,storeLink,type,inTime,inPhoto,inLat,inLon,inLocLink,inDistM,outTime,outPhoto,outLat,outLon,outLocLink,outDistM) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),store=VALUES(store),storeArea=VALUES(storeArea),storeLink=VALUES(storeLink),type=VALUES(type),inTime=VALUES(inTime),inPhoto=VALUES(inPhoto),inLat=VALUES(inLat),inLon=VALUES(inLon),inLocLink=VALUES(inLocLink),inDistM=VALUES(inDistM),outTime=VALUES(outTime),outPhoto=VALUES(outPhoto),outLat=VALUES(outLat),outLon=VALUES(outLon),outLocLink=VALUES(outLocLink),outDistM=VALUES(outDistM)',
        [x.empId, x.date, x.name || '', x.store || '', x.storeArea || '', x.storeLink || '', x.type || 'Duty', x.inTime || '', x.inPhoto || '', x.inLat || '', x.inLon || '', x.inLocLink || '', x.inDistM ?? null, x.outTime || '', x.outPhoto || '', x.outLat || '', x.outLon || '', x.outLocLink || '', x.outDistM ?? null]
      );
    }
    if (admin && admin.id && admin.pass) {
      await conn.query(
        'INSERT INTO admins (id,pass,mob,movie,birth,school) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE pass=VALUES(pass),mob=VALUES(mob),movie=VALUES(movie),birth=VALUES(birth),school=VALUES(school)',
        [admin.id, admin.pass, admin.mob || '', admin.movie || '', admin.birth || '', admin.school || '']
      );
      await conn.query('DELETE FROM admins WHERE id<>?', [admin.id]);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.json({ ok: false, error: e.message }); }
  finally { conn.release(); }
});

// ---------- EMPLOYEES ----------
app.get('/api/employees', checkAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees');
  res.json({ ok: true, emp: rows });
});
app.post('/api/employees', checkAuth, async (req, res) => {
  const x = req.body || {};
  if (!x.name || !x.id || !x.pass) return res.json({ ok: false, error: 'required' });
  try {
    await pool.query(
      'INSERT INTO employees (id,name,pass,desg,mob,photo,store,storeArea,storeLat,storeLon,storeLink,created,mustChangePass) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [x.id, x.name, x.pass, x.desg || '', x.mob || '', x.photo || '', x.store || '', x.storeArea || '', x.storeLat ?? null, x.storeLon ?? null, x.storeLink || '', x.created || null, 1]
    );
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: 'duplicate' }); }
});
app.put('/api/employees/:id', checkAuth, async (req, res) => {
  const x = req.body || {};
  await pool.query('UPDATE employees SET name=COALESCE(?,name),pass=COALESCE(?,pass),desg=COALESCE(?,desg),mob=COALESCE(?,mob),photo=COALESCE(?,photo),store=COALESCE(?,store),storeArea=COALESCE(?,storeArea),storeLat=COALESCE(?,storeLat),storeLon=COALESCE(?,storeLon),storeLink=COALESCE(?,storeLink),mustChangePass=COALESCE(?,mustChangePass) WHERE id=?',
    [x.name ?? null, x.pass ?? null, x.desg ?? null, x.mob ?? null, x.photo ?? null, x.store ?? null, x.storeArea ?? null, x.storeLat ?? null, x.storeLon ?? null, x.storeLink ?? null, x.mustChangePass == null ? null : (x.mustChangePass ? 1 : 0), req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/employees/:id', checkAuth, async (req, res) => {
  await pool.query('DELETE FROM employees WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});
app.post('/api/employee/login', checkAuth, async (req, res) => {
  const { id, pass } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM employees WHERE id=?', [id]);
  let f = rows[0];
  if (!f) { // case-insensitive fallback
    const [all] = await pool.query('SELECT * FROM employees');
    f = all.find(x => String(x.id).toLowerCase() === String(id || '').toLowerCase());
  }
  if (f && String(f.pass) === String(pass || '')) return res.json({ ok: true, emp: f });
  res.json({ ok: false, error: 'wrong' });
});

// ---------- RECORDS ----------
app.get('/api/records', checkAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM records ORDER BY `date` DESC');
  res.json({ ok: true, rec: rows });
});
app.delete('/api/records', checkAuth, async (req, res) => {
  await pool.query('DELETE FROM records');
  res.json({ ok: true });
});

// static frontend (Render single service: backend + index.html dono)
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Get-Attendend backend ON :' + PORT));
