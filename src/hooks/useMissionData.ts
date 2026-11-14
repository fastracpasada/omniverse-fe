import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { missionApi } from '../services/missionApi'
import { useMissionStore } from '../stores/missionStore'

export function useMissionData() {
  const health = useQuery({ queryKey: ['api', 'health'], queryFn: missionApi.getHealth, retry: false, refetchInterval: 30_000 })
  const sites = useQuery({ queryKey: ['api', 'sites'], queryFn: () => missionApi.getSites(), retry: false, staleTime: 60_000 })
  const site = sites.data?.items[0]
  const siteId = site?.id
  const layers = useQuery({ queryKey: ['api', 'layers', siteId], queryFn: () => missionApi.getLayers(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  const targets = useQuery({ queryKey: ['api', 'science-targets', siteId], queryFn: () => missionApi.getScienceTargets(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 30_000 })
  const hazards = useQuery({ queryKey: ['api', 'hazards', siteId], queryFn: () => missionApi.getHazards(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  const terrain = useQuery({ queryKey: ['api', 'terrain-metadata', siteId], queryFn: () => missionApi.getTerrainMetadata(siteId!), enabled: Boolean(siteId), retry: false, staleTime: 60_000 })
  const terrainSample = useQuery({
    queryKey: ['api', 'terrain-sample', siteId, site?.habitat_location.x_m, site?.habitat_location.y_m],
    queryFn: () => missionApi.getTerrainSample(siteId!, site!.habitat_location.x_m, site!.habitat_location.y_m),
    enabled: Boolean(siteId && site),
    retry: false,
    staleTime: 60_000,
  })
  const selectedScienceId = useMissionStore((state) => state.selectedScienceId)
  const selectScience = useMissionStore((state) => state.selectScience)
  useEffect(() => {
    const firstTarget = targets.data?.items[0]
    if (firstTarget && !targets.data?.items.some((target) => target.id === selectedScienceId)) selectScience(firstTarget.id)
  }, [targets.data, selectedScienceId, selectScience])

  return { health, sites, site, siteId, layers, targets, hazards, terrain, terrainSample, apiConnected: health.data?.database === true }
}