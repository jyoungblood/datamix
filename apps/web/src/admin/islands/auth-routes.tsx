import ForgotPasswordRoute from "@/admin/_screens/forgot-password";
import LoginRoute from "@/admin/_screens/login";
import ResetPasswordRoute from "@/admin/_screens/reset-password";
import SetupRoute from "@/admin/_screens/setup";

export function LoginIsland() {
  return <LoginRoute />;
}

export function SetupIsland() {
  return <SetupRoute />;
}

export function ForgotPasswordIsland() {
  return <ForgotPasswordRoute />;
}

export function ResetPasswordIsland() {
  return <ResetPasswordRoute />;
}
