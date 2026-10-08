<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Crée (ou promeut) un compte administrateur — le premier compte en production, où
 * aucun compte de démo n'existe. Sans option, un mot de passe est généré et affiché une
 * seule fois ; avec --mail, un lien pour définir le mot de passe est envoyé à la place.
 *
 *   php artisan chantier:admin login@step-one.ch --name="Step One"
 */
class MakeAdmin extends Command
{
    protected $signature = 'chantier:admin
                            {email : Adresse e-mail du compte}
                            {--name= : Nom affiché (création uniquement)}
                            {--password= : Mot de passe (défaut : généré et affiché)}
                            {--mail : Envoyer le lien pour définir le mot de passe (au lieu de l\'afficher)}';

    protected $description = 'Crée ou promeut un compte administrateur (premier compte en production).';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("Adresse e-mail invalide : {$email}");

            return self::FAILURE;
        }

        $password = (string) $this->option('password');
        if ($password !== '' && strlen($password) < 8) {
            $this->error('Mot de passe trop court (8 caractères minimum).');

            return self::FAILURE;
        }

        (new RolesSeeder)->run();

        $user = User::withTrashed()->where('email', $email)->first();
        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }
            $this->line("Compte existant : {$user->name} <{$email}>");
        } else {
            $user = User::create([
                'name' => trim((string) $this->option('name')) ?: $email,
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
            ]);
            $this->line("Compte créé : {$user->name} <{$email}>");
        }
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();

        $user->assignRole('admin');
        $this->info('Rôle admin attribué.');

        if ($this->option('mail')) {
            $status = Password::sendResetLink(['email' => $email]);
            if ($status !== Password::RESET_LINK_SENT) {
                $this->error('Envoi du lien impossible : '.__($status).' (vérifier MAIL_* du .env, ou utiliser --password).');

                return self::FAILURE;
            }

            $this->info("Lien pour définir le mot de passe envoyé à {$email}.");

            return self::SUCCESS;
        }

        $generated = $password === '';
        if ($generated) {
            $password = Str::password(14, symbols: false);
        }
        $user->forceFill(['password' => Hash::make($password)])->save();

        $this->info($generated
            ? "Mot de passe généré (à noter maintenant, il ne sera plus affiché) : {$password}"
            : 'Mot de passe défini.');
        $this->line('Connexion possible tout de suite ; à changer ensuite dans « Mon profil ».');

        return self::SUCCESS;
    }
}
