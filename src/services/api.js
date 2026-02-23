const API = import.meta.env.VITE_API_BASE.replace(/\/$/, '')

async function handle(res) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    return body?.data ?? body
}

/**
 * byAuthor devuelve { blueprints, totalPoints } (AuthorBlueprintsDTO)
 * getOne devuelve { author, name, points }
 */
export const BlueprintsAPI = {
    byAuthor: (author) =>
        fetch(`${API}/blueprints/${author}`).then(handle),

    getOne: (author, name) =>
        fetch(`${API}/blueprints/${author}/${name}`).then(handle),

    create: ({ author, name, points }) =>
        fetch(`${API}/blueprints`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ author, name, points })
        }).then(handle),

    update: (author, name, points) =>
        fetch(`${API}/blueprints/${author}/${name}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ author, name, points })
        }).then(handle),

    addPoint: (author, name, point) =>
        fetch(`${API}/blueprints/${author}/${name}/points`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify(point)
        }).then(handle),

    remove: (author, name) =>
        fetch(`${API}/blueprints/${author}/${name}`, { method:'DELETE' }).then(handle),
}