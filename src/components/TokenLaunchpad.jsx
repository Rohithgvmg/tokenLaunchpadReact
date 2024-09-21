import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, createMintToInstruction,getAssociatedTokenAddressSync,createAssociatedTokenAccountInstruction } from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';


export function TokenLaunchpad() {
   const {connection} =useConnection();
   const wallet=useWallet();
   async function createToken(){
      const mintKeypair=Keypair.generate();

      const metadata={
        mint:mintKeypair.publicKey,
        name:'MANI',
        symbol:'MANI',
        uri:"https://fastly.picsum.photos/id/16/2500/1667.jpg?hmac=uAkZwYc5phCRNFTrV_prJ_0rP0EdwJaZ4ctje2bY7aE",
        additionalMetadata:[],
      };

      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
       // Size of Mint Account with extension
       //mint account with extension means it is a mint account also storing metadata in itself



      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
       // Size of MetadataExtension 2 bytes for type, 2 bytes for length and pack thing is size of metadata
       
      const lamports=await connection.getMinimumBalanceForRentExemption(mintLen+metadataLen);
      

      //transactions here are set of instructions 
      const transaction=new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey:wallet.publicKey,// Account that will transfer lamports to created account
            newAccountPubkey:mintKeypair.publicKey,
             // Address of the account to create
            space:mintLen,
            lamports,
            programId:TOKEN_2022_PROGRAM_ID
        }),
        createInitializeMetadataPointerInstruction(
            mintKeypair.publicKey,wallet.publicKey,
            mintKeypair.publicKey,TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(mintKeypair.publicKey,9,wallet.publicKey,wallet.publicKey,TOKEN_2022_PROGRAM_ID),
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            mint: mintKeypair.publicKey,
            metadata: mintKeypair.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            mintAuthority: wallet.publicKey,
            updateAuthority: wallet.publicKey,
        })
      );

      transaction.feePayer=wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.partialSign(mintKeypair);

      await wallet.sendTransaction(transaction, connection);

      document.getElementById("status").innerHTML=`TOKEN MINT AT ADDRESS ${mintKeypair.publicKey} \n WITH MINT AUTHORITY HELD BY ${wallet.publicKey}`;

      const associatedToken=getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );

      // console.log("ATA IS: "+associatedToken.toBase58());
      
      const transaction2=new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedToken,
          wallet.publicKey,//owner of new acc
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID,
        )
      );
        
      await wallet.sendTransaction(transaction2,connection);

      document.getElementById("status").innerHTML=`ATA is: ${associatedToken.toBase58()}`;
      const transaction3=new Transaction().add(
        createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, 10000000, [], TOKEN_2022_PROGRAM_ID)
      );

      await wallet.sendTransaction(transaction3, connection);
      document.getElementById("status").innerHTML="Minting done ";
   }

  return  <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column'
  }}>
      <h1>Solana Token Launchpad</h1>
      <input className='inputText' type='text' placeholder='Name'></input> <br />
      <input className='inputText' type='text' placeholder='Symbol'></input> <br />
      <input className='inputText' type='text' placeholder='Image URL'></input> <br />
      <input className='inputText' type='text' placeholder='Initial Supply'></input> <br />
      <button onClick={createToken} className='btn'>Create a token</button>
      <div id="status"></div>
  </div>
}
