import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth)
  const hasToken = Boolean(localStorage.getItem("token"))

  // Check cả Redux state và localStorage token
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />
  }

  return children
}
