import { useAuth } from "../hooks/useAuth";
import Welcome from "./Welcome";
import Landing from "./Landing";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Welcome /> : <Landing />;
}