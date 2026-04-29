
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
<div style="
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  background:var(--page-bg); gap:20px; text-align:center; padding:40px;">

  <div style="
    font-family:'Playfair Display',serif;
    font-size:8rem; font-weight:900; line-height:1;
    color:var(--ey); opacity:0.15;">404</div>

  <div style="margin-top:-60px">
    <h1 style="font-family:'Playfair Display',serif;font-size:2rem;margin-bottom:12px">
      Page introuvable
    </h1>
    <p style="color:var(--text-muted);font-size:15px;max-width:360px">
      La page que vous cherchez n'existe pas ou a été déplacée.
    </p>
  </div>

  <div style="display:flex;gap:12px;margin-top:8px">
    <a class="btn btn-primary" routerLink="/dashboard">← Dashboard</a>
    <a class="btn btn-secondary" routerLink="/login/entreprise">Connexion</a>
  </div>
</div>`
})
export class NotFoundComponent {}

