import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Welcome from "./Welcome";
import Landing from "./Landing";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  if (isAuthenticated && searchParams.get("section") === "contact") {
    return <Landing />;
  }

  return isAuthenticated ? <Welcome /> : <Landing />;
}