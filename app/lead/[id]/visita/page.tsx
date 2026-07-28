"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProgramarVisitaPage() {

  const { id } = useParams<{id:string}>();
  const router = useRouter();

  const [fecha,setFecha] = useState("");
  const [hora,setHora] = useState("09:00");
  const [responsable,setResponsable] = useState("");
  const [notas,setNotas] = useState("");
  const [mensaje,setMensaje] = useState("");

  async function guardar(){

    const res = await fetch(`/api/leads/${id}`,{
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        accion:"crear_visita",
        fecha,
        hora,
        responsable_id: responsable || null,
        notas
      })
    });

    const data = await res.json();

    if(data.ok){
      setMensaje("Visita programada correctamente");

      setTimeout(()=>{
        router.push(`/lead/${id}`);
      },1000);

    } else {
      setMensaje(data.error || "Error");
    }
  }

  return (
    <main className="min-h-screen bg-paper p-10">

      <div className="max-w-xl mx-auto bg-white rounded-xl p-6 space-y-5">

        <h1 className="text-2xl font-bold text-navy">
          Programar visita FACILIA
        </h1>

        <div>
          <label>Fecha</label>
          <input
            type="date"
            className="border rounded p-2 w-full"
            value={fecha}
            onChange={e=>setFecha(e.target.value)}
          />
        </div>

        <div>
          <label>Hora</label>
          <input
            type="time"
            className="border rounded p-2 w-full"
            value={hora}
            onChange={e=>setHora(e.target.value)}
          />
        </div>

        <div>
          <label>Responsable</label>
          <input
            className="border rounded p-2 w-full"
            placeholder="Responsable de visita"
            value={responsable}
            onChange={e=>setResponsable(e.target.value)}
          />
        </div>

        <div>
          <label>Notas</label>
          <textarea
            className="border rounded p-2 w-full"
            value={notas}
            onChange={e=>setNotas(e.target.value)}
          />
        </div>

        <button
          onClick={guardar}
          className="bg-navy text-white px-5 py-3 rounded"
        >
          Confirmar visita
        </button>

        {mensaje &&
          <p>{mensaje}</p>
        }

      </div>

    </main>
  );
}
