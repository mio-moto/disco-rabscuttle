export interface AppInfo {
  [key: string]: {
    success: boolean
    data: {
      type: string
      name: string
      steam_appid: number
      required_age: number
      is_free: boolean
      dlc?: number[]
      fullgame?: { appid: string; name: string }
      detailed_description: string
      about_the_game: string
      short_description: string
      supported_languages: string
      controller_support?: string
      reviews?: string
      header_image: string
      website: string | null
      pc_requirements?: Requirement | unknown[]
      mac_requirements?: Requirement | unknown[]
      linux_requirements?: Requirement | unknown[]
      developers: string[]
      legal_notice?: string
      drm_notice?: string
      publishers: string[]
      demos?: { appid: number; description: string }[]
      price_overview?: {
        currency: string
        initial: number
        final: number
        discount_percent: number
        initial_formatted: string
        final_formatted: string
      }
      packages?: number[]
      package_groups: Package[]
      platforms: {
        [key: string]: boolean
      }
      metacritic?: {
        score: number
        url: string
      }
      categories: { id: number; description: string }[]
      genres: { id: string; description: string }[]
      screenshots: { id: number; path_thumbnail: string; path_full: string }[]
      movies?: {
        id: number
        name: string
        thumbnail: string
        webm: Video
        mp4: Video
        highlight: boolean
      }[]
      recommendations?: { total: number }
      achievements?: {
        total: number
        highlighted: { name: string; path: string }[]
      }
      release_date: { coming_soon: boolean; date: string }
      support_info: { url: string; email: string }
      background: string
      background_raw: string
      content_descriptors: { ids: number[]; notes: string }
    }
  }
}

export interface Requirement {
  minimum?: string
  recommended?: string
}

export interface Video {
  [key: string]: string
}

export interface Package {
  name: string
  title: string
  description: string
  selection_text: string
  save_text: string
  display_type: number
  is_recurring_subscription: 'true' | 'false'
  subs: SubPackage[]
}

export interface SubPackage {
  packageid: number
  percent_savings_text: string
  percent_savings: number
  option_text: string
  option_description: string
  can_get_free_license: string
  is_free_license: boolean
  price_in_cents_with_discount: number
}
