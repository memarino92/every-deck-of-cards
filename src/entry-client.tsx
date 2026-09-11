import { createRouter, useLocation, useNavigate } from '@solidjs/router'
import { render } from '@solidjs/web'
import { lazy, Loading, onSettled } from 'solid-js'

import { HomePage } from './HomePage.tsx'
import { Layout } from './Layout.tsx'
import './styles.css'

const ArrangePage = lazy(() => import('./ArrangePage.tsx'), {
  export: 'ArrangePage',
})
const CardGridPage = lazy(() => import('./dev/CardGridPage.tsx'), {
  export: 'CardGridPage',
})
const HowPage = lazy(() => import('./HowPage.tsx'), { export: 'HowPage' })
const TalkPage = lazy(() => import('./TalkPage.tsx'), { export: 'TalkPage' })
const WhyPage = lazy(() => import('./WhyPage.tsx'), { export: 'WhyPage' })

function ExploreRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  onSettled(() => {
    queueMicrotask(() => {
      navigate(`/${location.search}${location.hash}`, { replace: true })
    })
  })

  return null
}

const Router = createRouter({
  routes: [
    { path: '/talk', component: TalkPage },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '/', component: HomePage },
        { path: '/arrange', component: ArrangePage },
        { path: '/explore', component: ExploreRedirect },
        { path: '/dev/cards', component: CardGridPage },
        { path: '/why', component: WhyPage },
        { path: '/how', component: HowPage },
      ],
    },
  ],
})

// Start mode's document shell renders an empty <body> in client posture; the
// authored entry owns the mount, rendering straight into document.body.
render(
  () => (
    <Router>
      {(props) => (
        <Loading fallback={<output>Loading page…</output>}>
          {props.children}
        </Loading>
      )}
    </Router>
  ),
  document.body,
)
