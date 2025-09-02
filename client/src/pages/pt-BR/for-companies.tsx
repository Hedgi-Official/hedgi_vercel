import { Header } from "@/components/header";
import { UnderConstruction } from "@/components/under-construction";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

export default function ForCompanies() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      <UnderConstruction title="Para Empresas" />
    </>
  );
}