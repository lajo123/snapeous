import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * ProjectDetail: redirects to the Analysis page.
 * Kept as a route handler so /projects/:id still resolves.
 */
export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/projects/${id}/analysis`, { replace: true });
    }
  }, [id, navigate]);

  return null;
}
