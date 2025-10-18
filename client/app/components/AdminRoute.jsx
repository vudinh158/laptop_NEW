import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isAdmin = user?.roles?.includes("admin")

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
