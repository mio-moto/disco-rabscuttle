/* Results in:
{image:{image}}
{border:line}
^^^^{due}
^^{message}





*/

const imageFragment = '{image:{image}}\n'
const borderFragment = '{border:line}\n'
const dueFragment = '^^^^{due}\n'
const taskFragment = '^^{message}'
const postSpaceFragment = '\n\n\n\n'

export const makeDocument = (task: string, parameters?: { due?: string; image?: Buffer; withSpace?: boolean }) => {
  const { due, image, withSpace } = parameters ?? {}
  let message = ''
  if (image) {
    message += imageFragment.replace('{image}', image.toString('base64'))
  }
  message += borderFragment
  if (due) {
    message += dueFragment.replace('{due}', due)
  }
  message += taskFragment.replace('{message}', task)
  if (withSpace) {
    message += postSpaceFragment
  }
  return [message, 'default']
}
