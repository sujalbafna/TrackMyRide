'use client';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Bus, UserProfile, WithId, Stop } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useState, useMemo, useCallback } from 'react';
import { MapView } from '@/components/map-view';

const libraries: ("places")[] = ["places"];

export const routeSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  description: z.string().optional(),
  busId: z.string().optional(),
  driverId: z.string().optional(),
  stops: z
    .array(
      z.object({
        name: z.string().min(1, 'Stop name cannot be empty'),
        latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
        longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
      })
    )
    .min(1, 'At least one stop is required'),
});

export type RouteFormValues = z.infer<typeof routeSchema>;

interface RouteFormProps {
  form: UseFormReturn<RouteFormValues>;
  onSubmit: (values: RouteFormValues) => void;
  buses: WithId<Bus>[];
  drivers: WithId<UserProfile>[];
  buttonText?: string;
}

export function RouteForm({
  form,
  onSubmit,
  buses,
  drivers,
  buttonText = 'Submit',
}: RouteFormProps) {
  const {
    formState: { isSubmitting },
    control,
    setValue,
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stops',
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const watchedStops = watch('stops');

  const previewStops = useMemo(() => {
    return watchedStops.map((s, idx) => ({
      ...s,
      id: `temp-${idx}`,
      stopOrder: idx,
    })) as WithId<Stop>[];
  }, [watchedStops]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="h-full overflow-y-auto pr-4 custom-scrollbar">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-8">
            <div className="space-y-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Morning Route A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the route..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="busId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Bus</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {buses.map((bus) => (
                            <SelectItem key={bus.id} value={bus.id}>
                              {bus.busNumber} (Cap: {bus.capacity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Driver</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a driver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.firstName} {driver.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base">Stops Sequence</FormLabel>
                  <p className="text-xs text-muted-foreground">Add stops in order of arrival.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', latitude: 18.4912, longitude: 74.0255 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Stop
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <StopItem 
                    key={field.id}
                    index={index}
                    remove={remove}
                    control={control}
                    setValue={setValue}
                    isLoaded={isLoaded}
                    canRemove={fields.length > 1}
                  />
                ))}
              </div>
               <FormMessage>{form.formState.errors.stops?.message}</FormMessage>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg sticky bottom-0 z-20 shadow-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </form>
        </Form>
      </div>

      <div className="hidden lg:flex flex-col h-full bg-muted rounded-xl overflow-hidden border border-border relative">
        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm p-3 rounded-lg border shadow-sm max-w-xs">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live Route Preview
          </h4>
          <p className="text-[10px] text-muted-foreground mt-1">Search for stops on the left to see them appear on the map and road directions being calculated.</p>
        </div>
        <div className="flex-1">
          <MapView stops={previewStops} />
        </div>
      </div>
    </div>
  );
}

function StopItem({ index, remove, control, setValue, isLoaded, canRemove }: { 
    index: number, 
    remove: (i: number) => void, 
    control: any, 
    setValue: any, 
    isLoaded: boolean,
    canRemove: boolean
}) {
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onPlaceChanged = useCallback(() => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const name = place.formatted_address || place.name || '';
                
                setValue(`stops.${index}.name`, name, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                setValue(`stops.${index}.latitude`, lat, { shouldValidate: true, shouldDirty: true });
                setValue(`stops.${index}.longitude`, lng, { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [autocomplete, index, setValue]);

    return (
        <div className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow relative">
            <div className="flex items-center justify-between mb-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold">
                  {index + 1}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={!canRemove}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            
            <FormField
                control={control}
                name={`stops.${index}.name`}
                render={({ field }) => (
                <FormItem>
                    <FormControl>
                        {isLoaded ? (
                            <Autocomplete 
                                onLoad={(instance) => setAutocomplete(instance)} 
                                onPlaceChanged={onPlaceChanged}
                            >
                                <Input 
                                  placeholder="Search for location (Stop Name)" 
                                  {...field} 
                                  className="bg-background"
                                  autoComplete="off"
                                />
                            </Autocomplete>
                        ) : (
                            <Input placeholder="Loading map services..." {...field} disabled />
                        )}
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
    );
}