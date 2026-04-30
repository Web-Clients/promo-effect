/**
 * BookingMap — Phase A6
 * Re-export of ContainerMap for use in BookingDetail and elsewhere.
 * ContainerMap moved here to decouple from the removed Tracking page.
 */

export {
  default,
  type ContainerMapProps,
  type ContainerLocation,
  type VesselInfo,
  type RouteData,
  type RoutePin,
} from '../ContainerMap';
