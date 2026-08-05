import AuthLayout from "../components/AuthLayout";
import LoginForm from "../components/LoginForm";
import SocialLogin from "../components/SocialLogin";

export default function Login() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Secure access to AI Outcome Verification"
    >
      <LoginForm />
      <SocialLogin dividerText="or continue with" />
    </AuthLayout>
  );
}
