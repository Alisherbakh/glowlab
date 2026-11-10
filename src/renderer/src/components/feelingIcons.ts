import SentimentDissatisfiedOutlined from '@mui/icons-material/SentimentDissatisfiedOutlined'
import SentimentNeutralOutlined from '@mui/icons-material/SentimentNeutralOutlined'
import SentimentSatisfiedOutlined from '@mui/icons-material/SentimentSatisfiedOutlined'
import SentimentVeryDissatisfiedOutlined from '@mui/icons-material/SentimentVeryDissatisfiedOutlined'
import SentimentVerySatisfiedOutlined from '@mui/icons-material/SentimentVerySatisfiedOutlined'

// His-tuyg'u 1..5 → ikonka (indeks = qiymat − 1). Ikonka yonida doim matn ham bo'ladi (faqat rasm emas)
export const FEELING_ICONS = [
  SentimentVeryDissatisfiedOutlined,
  SentimentDissatisfiedOutlined,
  SentimentNeutralOutlined,
  SentimentSatisfiedOutlined,
  SentimentVerySatisfiedOutlined
]
