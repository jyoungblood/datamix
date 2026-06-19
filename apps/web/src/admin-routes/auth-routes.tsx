import ForgotPasswordRoute from "@/app/admin/_screens/forgot-password";
import LoginRoute from "@/app/admin/_screens/login";
import ResetPasswordRoute from "@/app/admin/_screens/reset-password";
import SetupRoute from "@/app/admin/_screens/setup";

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
