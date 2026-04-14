import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_ROOT = import.meta.env.VITE_API_ROOT || '/api'

const STATUS_STYLE = {
  info: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  success: {
    background: 'rgba(90, 255, 178, 0.14)',
    border: '1px solid rgba(90, 255, 178, 0.55)',
  },
  error: {
    background: 'rgba(255, 90, 90, 0.16)',
    border: '1px solid rgba(255, 90, 90, 0.35)',
  },
}

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user_info') || 'null')
  } catch {
    return null
  }
}

const safeJson = async (res) => {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { message: text || res.statusText }
  }
}

const formatLink = (uri) => {
  try {
    new URL(uri)
    return uri
  } catch {
    return `${API_ROOT}${uri}`
  }
}

const authorizedFetch = (token, url, opts = {}) => {
  const headers = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(url, {
    credentials: 'include',
    ...opts,
    headers,
  })
}

const normalizeRole = (role) => (role === 'artist' ? 'artist' : 'user')

function App() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState(getStoredUser())
  const [token, setToken] = useState(localStorage.getItem('auth_token') || '')
  const [status, setStatus] = useState({ text: '', type: 'info' })
  const [music, setMusic] = useState([])
  const [albums, setAlbums] = useState([])
  const [albumDetail, setAlbumDetail] = useState(null)

  const [loginForm, setLoginForm] = useState({ input: '', password: '' })
  const [registerForm, setRegisterForm] =
    useState({ username: '', email: '', password: '', role: 'user' })
  const [uploadForm, setUploadForm] = useState({ title: '', musicFile: null, posterFile: null })
  const [albumForm, setAlbumForm] =
    useState({ title: '', tracks: '', posterFile: null })

  const currentRole = useMemo(() => normalizeRole(user?.role), [user])
  const isArtist = currentRole === 'artist'
  const isLoggedIn = Boolean(user)

  useEffect(() => {
    const handleError = (event) => {
      console.error('Uncaught error:', event.error)
      setStatus({ text: `Error: ${event.message}`, type: 'error' })
    }
    const handleRejection = (event) => {
      console.error('Unhandled rejection:', event.reason)
      setStatus({ text: `Error: ${event.reason?.message || event.reason}`, type: 'error' })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      localStorage.removeItem('auth_token')
    } else {
      localStorage.setItem('auth_token', token)
    }
  }, [token])

  useEffect(() => {
    if (!user) {
      localStorage.removeItem('user_info')
      setView('login')
    } else {
      localStorage.setItem('user_info', JSON.stringify(user))
    }
  }, [user])

  const handleAuthError = (message) => {
    setStatus({ text: message || 'Authentication required', type: 'error' })
    setToken('')
    setUser(null)
    setView('login')
  }

  const loadMusic = async () => {
    setStatus({ text: 'Loading music…', type: 'info' })
    try {
      const res = await authorizedFetch(token, `${API_ROOT}/music`, { method: 'GET' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Failed to load music')
      setMusic(body.music || [])
      setStatus({ text: 'Loaded music.', type: 'success' })
    } catch (err) {
      if (err.message?.toLowerCase().includes('unauthorized')) {
        handleAuthError('Login required to view music')
        return
      }
      setStatus({ text: err.message || 'Failed to load music', type: 'error' })
    }
  }

  const loadAlbums = async () => {
    setStatus({ text: 'Loading albums…', type: 'info' })
    setAlbumDetail(null)
    try {
      const res = await authorizedFetch(token, `${API_ROOT}/music/album`, { method: 'GET' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Failed to load albums')
      setAlbums(body.albums || [])
      setStatus({ text: 'Loaded albums.', type: 'success' })
    } catch (err) {
      console.error('Failed to load albums:', err)
      setStatus({ text: err.message || 'Failed to load albums', type: 'error' })
    }
  }

  const loadAlbumDetails = async (albumId) => {
    setStatus({ text: 'Loading album…', type: 'info' })
    let id = albumId;
    if (typeof id === 'object' && id._id) {
      id = id._id;
    }
    if (!id) {
      setStatus({ text: 'Invalid album ID', type: 'error' })
      return
    }
    try {
      const res = await authorizedFetch(token, `${API_ROOT}/music/albums/${id}`, { method: 'GET' })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Failed to load album')
      setAlbumDetail(body.album)
      setStatus({ text: 'Album loaded.', type: 'success' })
    } catch (err) {
      setAlbumDetail(null)
      setStatus({ text: err.message || 'Failed to load album', type: 'error' })
    }
  }

  const submitUpload = async (event) => {
    event.preventDefault()
    if (!uploadForm.title || !uploadForm.musicFile) {
      setStatus({ text: 'Pick a title and an audio file.', type: 'error' })
      return
    }

    setStatus({ text: 'Uploading…', type: 'info' })

    const form = new FormData()
    form.append('title', uploadForm.title)
    form.append('music', uploadForm.musicFile)
    if (uploadForm.posterFile) {
      form.append('poster', uploadForm.posterFile)
    }

    try {
      const res = await authorizedFetch(token, `${API_ROOT}/music/upload`, {
        method: 'POST',
        body: form,
      })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Upload failed')
      setStatus({ text: 'Upload succeeded!', type: 'success' })
      setUploadForm({ title: '', musicFile: null, posterFile: null })
      loadMusic()
    } catch (err) {
      if (err.message?.toLowerCase().includes('unauthorized')) {
        handleAuthError('Login required to upload tracks')
        return
      }
      setStatus({ text: err.message || 'Upload failed', type: 'error' })
    }
  }

  const submitAlbum = async (event) => {
    event.preventDefault()
    if (!albumForm.title) {
      setStatus({ text: 'Album title is required.', type: 'error' })
      return
    }

    setStatus({ text: 'Creating album…', type: 'info' })

    const tracks = albumForm.tracks
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    try {
      const form = new FormData()
      form.append('title', albumForm.title)
      form.append('musics', tracks.join(', '))
      if (albumForm.posterFile) {
        form.append('poster', albumForm.posterFile)
      }

      const res = await authorizedFetch(token, `${API_ROOT}/music/album`, {
        method: 'POST',
        body: form,
      })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Create album failed')
      setStatus({ text: 'Album created!', type: 'success' })
      setAlbumForm({ title: '', tracks: '', posterFile: null })
      loadAlbums()
    } catch (err) {
      if (err.message?.toLowerCase().includes('unauthorized')) {
        handleAuthError('Login required to create albums')
        return
      }
      setStatus({ text: err.message || 'Create album failed', type: 'error' })
    }
  }

  const login = async (event) => {
    event.preventDefault()
    if (!loginForm.input || !loginForm.password) {
      setStatus({ text: 'Provide username/email and password.', type: 'error' })
      return
    }

    setStatus({ text: 'Logging in…', type: 'info' })

    const payload = { password: loginForm.password }
    if (loginForm.input.includes('@')) {
      payload.email = loginForm.input
    } else {
      payload.username = loginForm.input
    }

    try {
      const res = await fetch(`${API_ROOT}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Login failed')

      setToken(body.token)
      setUser(body.user)
      setStatus({ text: 'Logged in successfully!', type: 'success' })
      setView('home')
      loadMusic()
      loadAlbums()
    } catch (err) {
      setStatus({ text: err.message || 'Login failed', type: 'error' })
    }
  }

  const register = async (event) => {
    event.preventDefault()
    if (!registerForm.username || !registerForm.email || !registerForm.password) {
      setStatus({ text: 'Fill all fields to create an account.', type: 'error' })
      return
    }

    setStatus({ text: 'Creating account…', type: 'info' })

    try {
      const res = await fetch(`${API_ROOT}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password,
          role: registerForm.role,
        }),
      })
      const body = await safeJson(res)
      if (!res.ok) throw new Error(body.message || 'Registration failed')

      setToken(body.token)
      setUser(body.user)
      setStatus({ text: 'Account created! You are now logged in.', type: 'success' })
      setView('home')
      loadMusic()
      loadAlbums()
    } catch (err) {
      setStatus({ text: err.message || 'Registration failed', type: 'error' })
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_ROOT}/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    setToken('')
    setUser(null)
    setStatus({ text: 'Logged out.', type: 'success' })
    setView('login')
  }

  useEffect(() => {
    loadMusic()
    loadAlbums()
  }, [])

  const formatUserRole = () => {
    if (!user) return 'Not logged in'
    return user.role === 'artist' ? 'Artist' : 'Listener'
  }

  const renderMusicCard = (musicItem) => {
    const id = musicItem._id || musicItem.id
    const artistName = musicItem.artist?.username || musicItem.artist || 'Unknown'
    return (
      <div key={id} className="card-item">
        <div className="music-row">
          {musicItem.poster ? (
            <img
              className="music-poster"
              src={formatLink(musicItem.poster)}
              alt={musicItem.title || 'cover'}
            />
          ) : null}
          <div className="music-meta">
            <h3>{musicItem.title || 'Untitled'}</h3>
            <p>
              <strong>By:</strong> {artistName}
            </p>
            <div className="music-actions">
              {musicItem.uri ? (
                <a
                  href={formatLink(musicItem.uri)}
                  target="_blank"
                  rel="noreferrer"
                  className="play-link"
                >
                  ▶ Play
                </a>
              ) : null}
              {isArtist ? (
                <button
                  className="secondary add-to-album"
                  onClick={() => {
                    const existing = albumForm.tracks
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean)
                    if (!existing.includes(id)) {
                      existing.push(id)
                    }
                    setAlbumForm((prev) => ({ ...prev, tracks: existing.join(', ') }))
                    setStatus({ text: 'Added track ID to album composer.', type: 'success' })
                  }}
                >
                  Add to album
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAlbumCard = (album) => {
    const tracks = album.musics || []
    const trackCount = tracks.length
    const trackNames = tracks
      .slice(0, 3)
      .map((t) => (t?.title ? `${t.title}` : t._id || t))
      .join(', ')
    return (
      <div key={album._id} className="card-item">
        <h3>{album.title || 'Untitled'}</h3>
        <p>
          <strong>ID:</strong> {album._id}
        </p>
        <p>
          <strong>Artist:</strong>{' '}
          {album.artist?.username || album.artist || 'Unknown'}
        </p>
        <p className="badge">
          Tracks: {trackCount} {trackCount ? `(${trackNames}${trackCount > 3 ? '...' : ''})` : ''}
        </p>
        <div className="music-actions">
          <button className="secondary view-album" onClick={() => loadAlbumDetails(album._id)}>
            View tracks
          </button>
        </div>
      </div>
    )
  }

  const renderAlbumDetail = () => {
    if (!albumDetail) return null

    const tracks = albumDetail.musics || []

    return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="album-detail-header" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {albumDetail.poster ? (
            <img
              className="music-poster"
              src={formatLink(albumDetail.poster)}
              alt={albumDetail.title || 'cover'}
            />
          ) : null}
          <div>
            <h4>{albumDetail.title || 'Untitled Album'}</h4>
            <p>
              <strong>Artist:</strong>{' '}
              {albumDetail.artist?.username || albumDetail.artist || 'Unknown'}
            </p>
            <p>
              <strong>Tracks:</strong> {tracks.length}
            </p>
          </div>
        </div>
        {tracks.length === 0 ? (
          <p style={{ marginTop: 10 }}>No tracks in this album yet.</p>
        ) : (
          <div className="list">
            {tracks.map((track) => {
              const title = track.title || 'Untitled'
              const artistName = track.artist?.username || track.artist || 'Unknown'
              return (
                <div key={track._id || track.id} className="card-item">
                  <div style={{ flex: 1 }}>
                    <h4>
                      {track.uri ? (
                        <a href={formatLink(track.uri)} target="_blank" rel="noreferrer">
                          {title}
                        </a>
                      ) : (
                        title
                      )}
                    </h4>
                    <p>
                      <strong>By:</strong> {artistName}
                    </p>
                  </div>
                  <div className="music-actions">
                    {track.uri ? (
                      <a
                        href={formatLink(track.uri)}
                        className="play-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ▶ Play
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button className="secondary" onClick={() => setAlbumDetail(null)}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const viewNavItems = [
    { id: 'home', label: 'Home', visible: true },
    { id: 'upload', label: 'Upload', visible: isArtist },
    { id: 'login', label: 'Login', visible: !isLoggedIn },
  ]

  return (
    <div className="app">
      <div className="music-background" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="music-note"
            style={{
              left: `${(i * 8) % 100}%`,
              animationDelay: `${(i * 0.6) % 3}s`,
              fontSize: `${12 + (i % 4) * 4}px`,
            }}
          >
            ♪
          </span>
        ))}
      </div>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <svg className="logo" viewBox="0 0 24 24" width="32" height="32">
            <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17S7.79 21 10 21 14 19.21 14 17V7H18V3H12Z" fill="currentColor"/>
          </svg>
          <div>
            <h1>Music Studio</h1>
            <p>React frontend for the API</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {viewNavItems
            .filter((item) => item.visible)
            .map((item) => (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
        </nav>

        <div className="sidebar__footer">
          {isLoggedIn ? (
            <button className="nav-item" style={{ width: '100%' }} onClick={logout}>
              Logout
            </button>
          ) : null}
          <p className="sidebar__hint">Backend API: {API_ROOT}</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar__info">
            <strong>{user?.username || 'Guest'}</strong>
            <span>{formatUserRole()}</span>
          </div>
          <div className="topbar__status" style={STATUS_STYLE[status.type] || STATUS_STYLE.info}>
            {status.text || 'Ready'}
          </div>
        </header>

        <div className="view">
          {view === 'home' ? (
            <>
              <div className="section-header">
                <h2 className="view-title">Music</h2>
                <button className="secondary" onClick={loadMusic}>
                  Refresh
                </button>
              </div>
              <div className="card">
                <div className="list">
                  {music.map(renderMusicCard)}
                  {!music.length ? <p className="hint">No music found. Start by uploading.</p> : null}
                </div>
              </div>

              <div className="section-header" style={{ marginTop: 24 }}>
                <h2 className="view-title">Albums</h2>
                <button className="secondary" onClick={loadAlbums}>
                  Refresh
                </button>
              </div>
              <div className="card">
                <div className="list">
                  {albums.map(renderAlbumCard)}
                  {!albums.length ? (
                    <p className="hint">No albums yet. Create one through the Upload view.</p>
                  ) : null}
                </div>
                {renderAlbumDetail()}
              </div>
            </>
          ) : null}

          {view === 'upload' ? (
            <>
              <h2 className="view-title">Upload</h2>
              <div className="card">
                <p className="hint">
                  Upload a track and optionally attach a cover image. You must be logged in as an artist to upload.
                </p>
                <form className="auth-form" onSubmit={submitUpload}>
                  <input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Track title"
                  />
                  <label htmlFor="music-file">Music File (Audio)</label>
                  <input
                    id="music-file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, musicFile: e.target.files?.[0] || null }))
                    }
                  />
                  <label htmlFor="poster-file">Cover Image (Optional)</label>
                  <input
                    id="poster-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, posterFile: e.target.files?.[0] || null }))
                    }
                  />
                  <button type="submit" className="secondary">
                    Upload track
                  </button>
                </form>
              </div>

              <div className="card" style={{ marginTop: 24 }}>
                <h3>Create album</h3>
                <p className="hint">
                  Create an album by specifying a title and a comma-separated list of track IDs.
                </p>
                <form className="auth-form" onSubmit={submitAlbum}>
                  <input
                    value={albumForm.title}
                    onChange={(e) => setAlbumForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Album title"
                  />
                  <textarea
                    value={albumForm.tracks}
                    onChange={(e) => setAlbumForm((p) => ({ ...p, tracks: e.target.value }))}
                    placeholder="Track IDs (comma separated)"
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                  <label htmlFor="album-poster">Album Cover Image (Optional)</label>
                  <input
                    id="album-poster"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setAlbumForm((p) => ({ ...p, posterFile: e.target.files?.[0] || null }))
                    }
                  />
                  <button type="submit" className="secondary">
                    Create album
                  </button>
                </form>
              </div>
            </>
          ) : null}

          {view === 'login' ? (
            <div>
              <h2 className="view-title">Login</h2>
              <div className="auth-card">
                <p className="hint">
                  Login with your username/email and password.
                  <br />
                  New? Create an account below.
                </p>
                <form className="auth-form" onSubmit={login}>
                  <input
                    value={loginForm.input}
                    onChange={(e) => setLoginForm((p) => ({ ...p, input: e.target.value }))}
                    placeholder="Username or email"
                  />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Password"
                  />
                  <button type="submit" className="secondary">
                    Login
                  </button>
                </form>
              </div>

              <div className="auth-card">
                <h2>Create an account</h2>
                <form className="auth-form" onSubmit={register}>
                  <input
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder="Username"
                  />
                  <input
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                  />
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Password"
                  />
                  <div className="auth-role">
                    <span>Role:</span>
                    <select
                      value={registerForm.role}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="user">Listener</option>
                      <option value="artist">Artist</option>
                    </select>
                  </div>
                  <button type="submit" className="secondary">
                    Create account
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="footer">
          Built with React + Vite. Backend assumed at <code>{API_ROOT}</code>.
        </footer>
      </main>
    </div>
  )
}

export default App
