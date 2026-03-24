import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';

/** Guard qui s'assure qu'un utilisateur connecté accède uniquement à son propre dashboard */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const role = authService.getCurrentUser()?.role?.toLowerCase() ?? '';

    if (allowedRoles.includes(role)) {
      return true;
    }

    // Rediriger vers le dashboard approprié
    if (role === 'admin') return router.createUrlTree(['/admin-dashboard']);
    if (role === 'seller') return router.createUrlTree(['/seller-dashboard']);
    return router.createUrlTree(['/buyer-dashboard']);
  };
};
