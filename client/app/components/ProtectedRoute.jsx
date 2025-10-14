import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
