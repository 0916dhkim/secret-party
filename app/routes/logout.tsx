import { logout } from "../auth/actions";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
  return logout(request);
}

// This component should never render since we always redirect in the loader
export default function Logout() {
  return <div>Logging out...</div>;
}
