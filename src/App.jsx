import { useEffect, useRef, useState } from 'react'
import { createStompClient, subscribeBlueprint } from './lib/stompClient.js'
import { createSocket } from './lib/socketIoClient.js'
import { BlueprintsAPI } from './services/api.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080' // Spring
const IO_BASE  = import.meta.env.VITE_IO_BASE  ?? 'http://localhost:3001' // Node/Socket.IO

export default function App() {
  const [tech, setTech] = useState('socketio')
  const [author, setAuthor] = useState('juan')
  const [name, setName] = useState('plano-1')
  const canvasRef = useRef(null)
  const stompRef = useRef(null)
  const unsubRef = useRef(null)
  const socketRef = useRef(null)
    const [points, setPoints] = useState([])
    const [authorList, setAuthorList] = useState([])
    const [authorTotal, setAuthorTotal] = useState(0)


    useEffect(() => {
        const url = `${API_BASE.replace(/\/$/, '')}/blueprints/${author}/${name}`;
        console.log('[GET]', url);

        fetch(url)
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const body = await r.json();
                console.log('[GET body]', body);

                const bp = body?.data ?? body;
                const points = Array.isArray(bp?.points) ? bp.points : [];
                setPoints(points);
                drawAll({ points });
            })
            .catch((err) => {
                console.error('Error cargando plano:', err);
                setPoints([]);
                drawAll({ points: [] });
            });
    }, [author, name]);

    useEffect(() => {
        BlueprintsAPI.byAuthor(author)
            .then(({ blueprints, totalPoints }) => {
                setAuthorList(Array.isArray(blueprints) ? blueprints : [])
                setAuthorTotal(typeof totalPoints === 'number' ? totalPoints : 0)
            })
            .catch(() => { setAuthorList([]); setAuthorTotal(0) })
    }, [author, name])

    function drawAll(bp) {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, 600, 400);
        const pts = Array.isArray(bp?.points) ? bp.points : [];
        if (pts.length === 0) return; // sin puntos → nada que trazar

        ctx.beginPath();
        pts.forEach(({ x, y }, i) => {
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

  useEffect(() => {
    unsubRef.current?.(); unsubRef.current = null
    stompRef.current?.deactivate?.(); stompRef.current = null
    socketRef.current?.disconnect?.(); socketRef.current = null

    if (tech === 'stomp') {
        const client = createStompClient(import.meta.env.VITE_STOMP_BASE || API_BASE)
      stompRef.current = client
      client.onConnect = () => {
        unsubRef.current = subscribeBlueprint(client, author, name, (upd)=> {
            setPoints(upd.points || []); drawAll({ points: upd.points })
        })
      }
      client.activate()
    } else {
      const s = createSocket(IO_BASE)
      socketRef.current = s
      const room = `blueprints.${author}.${name}`
      s.emit('join-room', room)
      s.on('blueprint-update', (upd)=> { setPoints(upd.points || []); drawAll({ points: upd.points }) })
    }
    return () => {
      unsubRef.current?.(); unsubRef.current = null
      stompRef.current?.deactivate?.()
      socketRef.current?.disconnect?.()
    }
  }, [tech, author, name])

  function onClick(e) {
    const rect = e.target.getBoundingClientRect()
    const point = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) }
      const next = [...points, point]
      setPoints(next)
      drawAll({ points: next })
    if (tech === 'stomp' && stompRef.current?.connected) {
      stompRef.current.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      const room = `blueprints.${author}.${name}`
      socketRef.current.emit('draw-event', { room, author, name, point })
    }

      fetch(`${API_BASE.replace(/\/$/, '')}/blueprints/${author}/${name}/points`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(point)}).catch((e)=> console.error('Persistencia PUT/points falló', e))

  }

  return (
    <div style={{fontFamily:'Inter, system-ui', padding:16, maxWidth:900}}>
      <h2>BluePrints RT – Socket.IO vs STOMP</h2>
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
        <label>Tecnología:</label>
        <select value={tech} onChange={e=>setTech(e.target.value)}>
          <option value="stomp">STOMP (Spring)</option>
          <option value="socketio">Socket.IO (Node)</option>
        </select>
        <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="autor"/>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="plano"/>

          <button onClick={async () => {
              const nm = prompt('Nombre del nuevo plano:', 'nuevo-plano')
              if (!nm) return
              await BlueprintsAPI.create({ author, name: nm, points: [] })
              setName(nm)
              const { blueprints, totalPoints } = await BlueprintsAPI.byAuthor(author)
              setAuthorList(blueprints || []); setAuthorTotal(totalPoints || 0)
              }}>Create
          </button>

          <button onClick={async () => {
              await BlueprintsAPI.update(author, name, points)
              alert('Guardado')
              const { blueprints, totalPoints } = await BlueprintsAPI.byAuthor(author)
              setAuthorList(blueprints || []); setAuthorTotal(totalPoints || 0)
              }}>Save/Update
          </button>

          <button onClick={async () => {
          if (!confirm(`Eliminar ${author}/${name}?`)) return
          await BlueprintsAPI.remove(author, name)
          setPoints([]); drawAll({ points: [] })
          const { blueprints, totalPoints } = await BlueprintsAPI.byAuthor(author)
          setAuthorList(blueprints || []); setAuthorTotal(totalPoints || 0)
          }}>Delete
          </button>

          <button onClick={async () => {
          const { blueprints, totalPoints } = await BlueprintsAPI.byAuthor(author)
          setAuthorList(blueprints || []); setAuthorTotal(totalPoints || 0)
          alert(`Total de puntos de ${author}: ${totalPoints || 0}`)
          }}>Total autor
          </button>

      </div>
        <div style={{marginBottom:8}}>
            <strong>Planos de {author}</strong> (Total puntos: {authorTotal})
            <ul>
                {authorList.map((bp) => (
                    <li key={`${bp.author}/${bp.name}`}>
                        <button onClick={() => setName(bp.name)} style={{marginRight:6}}>Abrir</button>
                        {bp.name} — puntos: {bp.points?.length ?? 0}
                    </li>
                ))}
            </ul>
        </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{border:'1px solid #ddd', borderRadius:12}}
        onClick={onClick}
      />
      <p style={{opacity:.7, marginTop:8}}>Tip: abre 2 pestañas y dibuja alternando para ver la colaboración.</p>
    </div>
  )
}
