import { redirect } from "next/navigation";

// Rota raiz redireciona para o dashboard
export default function RootPage() {
  redirect("/dashboard");
}
