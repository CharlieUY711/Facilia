import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CotizadorForm from "@/components/CotizadorForm";

export const metadata = { title: "Cotizador — FACILIA" };

export default function CotizadorPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="mb-10 text-center">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-navy mb-2">Cotizá tu servicio</h1>
          <p className="text-ink/60">Presupuesto instantáneo, sin compromiso.</p>
        </div>
        <CotizadorForm />
      </main>
      <Footer />
    </>
  );
}
