// Starts downloading a same-origin file, as a click on <a download> would
export function downloadFile(href: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = href.split('/').pop() ?? ''
  document.body.append(link)
  link.click()
  link.remove()
}
