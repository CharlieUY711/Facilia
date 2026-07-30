"use client";

import {useEffect,useState} from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";


export default function CotizadorPage(){

 const [variables,setVariables]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);


 async function cargar(){

   setLoading(true);

   const res = await fetch("/api/cotizador/variables");
   const data = await res.json();

   if(data.ok){
      setVariables(data.variables);
   }

   setLoading(false);
 }


 useEffect(()=>{
   cargar();
 },[]);


 if(loading){
   return (
    <div className="p-10 text-ink/50">
      Cargando cotizador...
    </div>
   )
 }


 return (

 <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-6">


 <div>
   <h1 className="font-display font-bold text-3xl text-navy">
     Cotizador FACILIA
   </h1>

   <p className="text-ink/60 mt-2">
     Configuración de variables, opciones y reglas de cálculo.
   </p>
 </div>



 {
 variables.map((v)=>(
 
 <Card key={v.id}>

   <div className="flex justify-between items-center mb-4">

    <div>
      <h2 className="font-display font-semibold text-xl text-navy">
        {v.nombre}
      </h2>

      <p className="text-sm text-ink/50">
        Tipo: {v.tipo}
      </p>

    </div>


    <Button variant="secondary" size="sm">
      Editar
    </Button>


   </div>



   <div className="space-y-2">

   {
    v.cotizador_opciones?.map((o:any)=>(

      <div
       key={o.id}
       className="flex justify-between border-b border-navy-100 py-2 text-sm"
      >

       <span>
        {o.nombre}
       </span>

       <span className="font-semibold text-orange">
        Factor {o.factor}
       </span>


      </div>

    ))
   }

   </div>


   <div className="mt-4">
    <Button variant="secondary" size="sm">
      + Agregar opción
    </Button>
   </div>


 </Card>

 ))
 }


 <Card>

   <h2 className="font-display font-semibold text-xl text-navy">
    Reglas de cálculo
   </h2>

   <p className="text-sm text-ink/60 mt-2">
    Próximamente: condiciones y fórmulas del presupuesto.
   </p>

 </Card>


 </main>

 )

}
