import { useEffect } from 'react'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { toast } from '@/lib/toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import UnitsEditor from '@/components/settings/UnitsEditor'

const schema = z.object({
  app_name: z.string().min(1, 'Le nom est requis.').max(255),
  app_logo_url: z.string().max(2048),
  app_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hexadécimale invalide (ex : #1d3f9c).'),
  regie_markup_percent: z.string().regex(/^\d{1,3}([.,]\d{1,2})?$/, 'Pourcentage invalide (ex : 30).'),
  work_day_hours: z.string().regex(/^\d{1,2}([.,]\d{1,2})?$/, 'Nombre d’heures invalide (ex : 9).'),
})

type FormValues = z.infer<typeof schema>

export default function SettingsPage() {
  const { data, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { app_name: '', app_logo_url: '', app_color: '#1d3f9c', regie_markup_percent: '30', work_day_hours: '9' },
  })

  const { field: colorField } = useController({ name: 'app_color', control })

  useEffect(() => {
    if (data) {
      reset({ ...data, regie_markup_percent: data.regie_markup_percent ?? '30', work_day_hours: data.work_day_hours ?? '9' })
    }
  }, [data, reset])

  function onSubmit(values: FormValues) {
    updateSettings.mutate({ ...values, regie_markup_percent: values.regie_markup_percent.replace(',', '.'), work_day_hours: values.work_day_hours.replace(',', '.') }, {
      onSuccess: () => toast('Configuration enregistrée.', 'success'),
    })
  }

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold text-gray-900">Configuration générale</h2>
      <p className="mt-1 text-sm text-gray-500">
        Identité de l'application, appliquée partout (en-tête, etc.).
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm"
      >
        <Input
          label="Nom de l'application"
          error={errors.app_name?.message}
          {...register('app_name')}
        />
        <Input
          label="URL du logo (optionnel)"
          placeholder="https://…/logo.png"
          error={errors.app_logo_url?.message}
          {...register('app_logo_url')}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Couleur principale</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorField.value}
              onChange={colorField.onChange}
              className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            />
            <span className="text-sm text-gray-500">{colorField.value}</span>
          </div>
          {errors.app_color && <p className="text-sm text-red-600">{errors.app_color.message}</p>}
        </div>

        <h3 className="pt-2 text-base font-semibold text-gray-900">Régie et contrôle des heures</h3>
        <Input
          label="Majoration des fournitures sans prix régie (%)"
          placeholder="30"
          error={errors.regie_markup_percent?.message}
          {...register('regie_markup_percent')}
        />
        <p className="-mt-3 text-xs text-gray-500">Appliquée au coût brut des matériaux, machines, outillage et tiers qui n'ont pas de prix régie dans les listes de prix (arrondi à 5 ct).</p>
        <Input label="Heures d'une journée de travail" placeholder="9" error={errors.work_day_hours?.message} {...register('work_day_hours')} />
        <p className="-mt-3 text-xs text-gray-500">Valeur proposée pour les vacances et absences du contrôle des heures.</p>

        <Button type="submit" loading={updateSettings.isPending}>
          Enregistrer
        </Button>
      </form>

      <div className="mt-6">
        <UnitsEditor />
      </div>
    </div>
  )
}
