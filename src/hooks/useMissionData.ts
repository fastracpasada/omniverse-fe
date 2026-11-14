import { useQuery } from '@tanstack/react-query'
import { missionApi } from '../services/missionApi'
export function useMissionData() {
  const health = useQuery({ queryKey: ['api', 'health'], queryFn: missionApi.getHealth, retry: false, refetchInterval: 30_000 })
  const sites = useQuery({ queryKey: ['api', 'sites'], queryFn: missionApi.getSites, retry: false, staleTime: 60_000 })
  const site = sites.data?.items[0]; const siteId = site?.id
  const layers = useQuery({ queryKey: ['api', 'layers', siteId], queryFn: () => missionApi.getLayers(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  const targets = useQuery({ queryKey: ['api', 'targets', siteId], queryFn: () => missionApi.getTargets(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 30_000 })
  const hazards = useQuery({ queryKey: ['api', 'hazards', siteId], queryFn: () => missionApi.getHazards(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  const terrain = useQuery({ queryKey: ['api', 'terrain', siteId], queryFn: () => missionApi.getTerrainMetadata(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  return { health, sites, site, siteId, layers, targets, hazards, terrain, apiConnected: health.data?.database === true }
}
