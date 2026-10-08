<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Régie (phase 5) : trois niveaux de prix sur chaque ligne de rapport (brut = coût, régie = tarif
     * majoré de l'entreprise, client = prix final), tarif régie des collaborateurs (élément de coûts
     * « Salaire ») et absences pour le contrôle des heures.
     */
    public function up(): void
    {
        Schema::table('collaborators', function (Blueprint $table) {
            // Position régie du collaborateur (élément de coûts de la famille Salaire : « Chef d'équipe 95.- »).
            $table->foreignId('regie_element_id')->nullable()->after('hourly_cost')->constrained('price_elements')->nullOnDelete();
            // Tarif régie propre à l'employé, prioritaire sur celui de la position.
            $table->decimal('regie_price', 8, 2)->nullable()->after('regie_element_id');
        });

        Schema::table('daily_report_hours', function (Blueprint $table) {
            $table->decimal('regie_price', 8, 2)->nullable()->after('hourly_cost');
            $table->decimal('client_price', 8, 2)->nullable()->after('regie_price');
            $table->decimal('regie_amount', 12, 2)->default(0)->after('amount');
            $table->decimal('client_amount', 12, 2)->default(0)->after('regie_amount');
        });

        Schema::table('daily_report_items', function (Blueprint $table) {
            $table->decimal('regie_price', 12, 2)->nullable()->after('unit_cost');
            $table->decimal('client_price', 12, 2)->nullable()->after('regie_price');
            $table->decimal('regie_amount', 12, 2)->default(0)->after('amount');
            $table->decimal('client_amount', 12, 2)->default(0)->after('regie_amount');
        });

        Schema::table('daily_reports', function (Blueprint $table) {
            $table->decimal('total_regie', 12, 2)->default(0)->after('total_amount');
            $table->decimal('total_client', 12, 2)->default(0)->after('total_regie');
        });

        // Absences d'un collaborateur (vacances, maladie, accident, férié, école…) : ligne du contrôle des heures.
        Schema::create('collaborator_absences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collaborator_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('type', 20);
            $table->decimal('hours', 5, 2);
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['collaborator_id', 'date']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collaborator_absences');
        Schema::table('daily_reports', fn (Blueprint $table) => $table->dropColumn(['total_regie', 'total_client']));
        Schema::table('daily_report_items', fn (Blueprint $table) => $table->dropColumn(['regie_price', 'client_price', 'regie_amount', 'client_amount']));
        Schema::table('daily_report_hours', fn (Blueprint $table) => $table->dropColumn(['regie_price', 'client_price', 'regie_amount', 'client_amount']));
        Schema::table('collaborators', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regie_element_id');
            $table->dropColumn('regie_price');
        });
    }
};
