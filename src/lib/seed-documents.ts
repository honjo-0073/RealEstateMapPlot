export const seedDocumentUrls: Record<string, string> = {
  '1': 'https://drive.google.com/file/d/14QF_pEBtgPmNSRu5GmJ8D38IdR5qju-Q/view?usp=drivesdk',
  '2': 'https://drive.google.com/file/d/1ZGpjBZWjdHD42R7YwdpXY1wBs9KYcMJw/view?usp=drivesdk',
  '3': 'https://drive.google.com/file/d/1Zhi0584L_dtW6-n_Lhwj0kC8GZmaqxJ0/view?usp=drivesdk',
  '4': 'https://drive.google.com/file/d/1wk0GPoW7AjrVpD1xkhsV6Y0cR9hnIM7B/view?usp=drivesdk',
  '5': 'https://drive.google.com/file/d/1LvHFdrzYF5FekFv6CAei5Rlf_nscEh43/view?usp=drivesdk',
  '6': 'https://drive.google.com/file/d/1ecNt1qMpjza-Fqt2f9PgAH3ZUK-jkfP_/view?usp=drivesdk',
  '7': 'https://drive.google.com/file/d/1hw1zPR0cHqe5ASBXCOMf6NX1eqYa7llc/view?usp=drivesdk',
  '8': 'https://drive.google.com/file/d/1lURrFGRGn5NivnzddkwTe0w-kquIvgkP/view?usp=drivesdk',
  '9': 'https://drive.google.com/file/d/1567oLhUY9UuVOYNlCaDgFC55ISexH80N/view?usp=drivesdk',
  '10': 'https://drive.google.com/file/d/1KChxuielRlUyer8fFa6lssnXyJhmIJpB/view?usp=drivesdk',
  '11': 'https://drive.google.com/file/d/1zshdjhLlle4wIzu-ljz9uQv-0xasEKDg/view?usp=drivesdk',
  '12': 'https://drive.google.com/file/d/1bRVb7Bs_3kF4-UP4p6OOa26ADHDmjvdx/view?usp=drivesdk',
  '13': 'https://drive.google.com/file/d/1hvM4sQaOpNgS05Bo4PWvh_qdsDpidGKg/view?usp=drivesdk',
  '14': 'https://drive.google.com/file/d/16l9Bvey8OZMGn3ubhBmB6QqaFgRo_FyH/view?usp=drivesdk'
};

export function extractDriveFileId(url: string) {
  return url.match(/\/d\/([^/]+)/)?.[1] ?? null;
}
