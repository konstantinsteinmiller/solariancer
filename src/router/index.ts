import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import useUser, { isWeb } from '@/use/useUser'
import { isDebug } from '@/use/useMatch.ts'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'main-menu',
    component: () => import('@/views/SolariancerGame.vue'),
    children: []
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

const remoteURL = import.meta.env.VITE_APP_REMOTE_URL
// --- THE ROUTER HOOK ---
router.beforeEach((to, from) => {
  const { userUnlocked, setSettingValue } = useUser()

  const url = window.location.href
  const storedUnlock: string = (localStorage.getItem('full_unlocked') as string)
  const parsedStoredUnlock: boolean = typeof storedUnlock === 'string' && storedUnlock?.length ? (JSON.parse(storedUnlock) as boolean) : false
  const isUnlocked = to.query.unlock === 'true' || to.query.unlocked === 'true' || from.query.unlocked === 'true' || parsedStoredUnlock === true

  // Only apply restrictions if it's the Web version
  if (isWeb) {
    const isFullVersion = url.includes(remoteURL + '/solariancer/') && !url.includes('/solariancer/demo/') && !url.includes('/solariancer/develop/')
    const isDevelopVersion = url.includes(remoteURL + '/solariancer/develop/')
    const isDev = url.includes('localhost:5173/')

    if (isDev) {
      return true
    }

    // If user is on Full or Develop without the unlock param, boot them to Demo
    if ((isFullVersion || isDevelopVersion) && !isUnlocked) {
      window.location.href = remoteURL + '/solariancer/demo/'
      return false// Stop execution
    } else if (isUnlocked && (isFullVersion || isDevelopVersion)) {
      localStorage.setItem('full_unlocked', 'true')
    }
  }

  return true
})

export default router
