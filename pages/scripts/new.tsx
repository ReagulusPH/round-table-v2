import type { NextPage } from 'next'
import { useEffect, useState, ChangeEvent } from 'react'
import Layout from '../../components/layout'
import { CardanoSerializationLib } from '../../cardano/serialization-lib'
import type { Cardano, MultiSigType } from '../../cardano/serialization-lib'
import Link from 'next/link'

const NewScript: NextPage = () => {
  const [addresses, setAddresses] = useState<Set<string>>(new Set())
  const [cardano, setCardano] = useState<Cardano | undefined>(undefined)
  const [isMainnet, setMainnet] = useState(true)

  useEffect(() => {
    let mounted = true

    CardanoSerializationLib.load().then((instance) => {
      mounted && setCardano(instance)
    })

    return () => {
      mounted = false
    }
  }, [])

  const onAddAddress = (address: string) => {
    const state = new Set(addresses)
    if (address.length > 0) {
      state.add(address)
    }
    setAddresses(state)
  }

  return (
    <Layout onNetworkSwitch={setMainnet}>
      {cardano && addresses.size > 0 && <Result addresses={addresses} cardano={cardano} isMainnet={isMainnet} />}
      {cardano && <AddAddress cardano={cardano} onAdd={onAddAddress} />}
    </Layout>
  )
}

type ResultProps = {
  addresses: Set<string>
  cardano: Cardano
  isMainnet: boolean
}

function Result({ addresses, cardano, isMainnet }: ResultProps) {
  const [isJSON, setJSON] = useState(false)
  const [type, setType] = useState<MultiSigType>('all')
  const [required, setRequired] = useState(1)

  const scriptAddress = addresses.size > 1 && cardano.getMultiSigScriptAddress(addresses, type, required, isMainnet)

  type SigScript = { type: 'sig', keyHash: string }
  type MultiSigScript =
    | { type: 'all', scripts: SigScript[] }
    | { type: 'any', scripts: SigScript[] }
    | { type: 'atLeast', scripts: SigScript[], required: number }
  const toJSONScript = (): MultiSigScript => {
    const scripts: SigScript[] = Array.from(addresses, (address) => {
      const keyHash = cardano.getKeyHashHex(address)
      return { type: 'sig', keyHash }
    })
    switch (type) {
      case 'all': return { type, scripts }
      case 'any': return { type, scripts }
      case 'atLeast': return { type, scripts, required }
    }
  }

  return (
    <div className='shadow bg-white border rounded-md mb-2'>
      <header className='flex p-3 border-b border-gray-100 bg-gray-100'>
        <div className='flex border border-blue-600 rounded-sm bg-blue-600 text-white text-sm'>
          <select className='block px-2 py-1 bg-transparent' onChange={(e) => setType(e.target.value as MultiSigType)}>
            <option value="all">All</option>
            <option value="any">Any</option>
            <option value="atLeast">At least</option>
          </select>
          {type == 'atLeast' &&
            <input type='number'
              className='block text-black w-12 pl-2 py-1 focus:outline-0'
              value={required}
              step={1}
              min={1}
              max={addresses.size}
              onChange={(e) => setRequired(parseInt(e.target.value))} />
          }
          <div className='px-2 py-1'>of&nbsp;{addresses.size}</div>
        </div>
        <label className='block px-2 py-1 text-sm'>
          <span>JSON</span>
          <input className='mx-1' type='checkbox' checked={isJSON} onChange={() => setJSON(!isJSON)} />
        </label>
      </header>
      {!scriptAddress && <h2 className='border-b border-gray-100 text-center p-4 text-gray-400'>Need more than 1 addresses</h2>}
      {scriptAddress && (
        <h2 className='border-b border-gray-100 font-bold text-center p-4'>
          <Link href={`/scripts/${scriptAddress}`}><a>{scriptAddress}</a></Link>
        </h2>
      )}
      {!isJSON && (
        <ul className='divide-y text-sm'>
          {Array.from(addresses, (address) => (
            <li className='p-3 border-gray-100' key={address}>
              <p>{address}</p>
              <p className='text-gray-400'>{cardano.getKeyHashHex(address)}</p>
            </li>
          ))}
        </ul>
      )}
      {isJSON && (
        <div className='p-2'>
          <code className='block p-1 text-sm bg-gray-100 rounded-sm'>
            {JSON.stringify(toJSONScript(), null, 2)}
          </code>
        </div>
      )}
    </div>
  )
}

type AddAddressProps = {
  cardano: Cardano
  onAdd: (value: string) => void
}

function AddAddress({ cardano, onAdd }: AddAddressProps) {
  const [value, setValue] = useState('')
  const [keyHash, setKeyHash] = useState('')
  const [error, setError] = useState('')

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const address = event.target.value.trim()
    setError('')
    setValue(address)
    try {
      setKeyHash(cardano.getKeyHashHex(address))
    } catch {
      setError('Invalid address')
    }
  }
  const onClick = () => {
    if (!error) {
      onAdd(value)
    }
    setValue('')
    setKeyHash('')
    setError('')
  }

  return (
    <div className='shadow bg-white border rounded-md mb-2'>
      <div className='px-4 py-5'>
        <textarea className='block w-full border border-gray-400 rounded-md p-2' onChange={onChange} rows={5} value={value} placeholder="Address"></textarea>
        {error && <p className='text-sm py-1 text-red-400'>{error}</p>}
        {!error && <p className='text-sm py-1 text-gray-400'>{keyHash}</p>}
      </div>
      <footer className='flex flex-row-reverse px-4 py-3 bg-gray-100'>
        <button className='py-2 px-4 border bg-blue-600 rounded-md text-white bg-blue-600 disabled:bg-gray-400' onClick={onClick} disabled={!keyHash}>
          Add Address
        </button>
      </footer>
    </div>
  )
}

export default NewScript