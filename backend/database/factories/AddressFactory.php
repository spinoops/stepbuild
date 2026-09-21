<?php

namespace Database\Factories;

use App\Models\Address;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Address>
 */
class AddressFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'client',
            'title' => 'Monsieur',
            'last_name' => fake()->lastName(),
            'first_name' => fake()->firstName(),
            'street' => fake()->streetName(),
            'street_no' => (string) fake()->numberBetween(1, 99),
            'zip' => (string) fake()->numberBetween(1000, 9999),
            'city' => fake()->city(),
            'is_active' => true,
        ];
    }
}
